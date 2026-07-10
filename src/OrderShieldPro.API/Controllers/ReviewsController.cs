using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.Commands;
using OrderShieldPro.Application.Reviews.Queries;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IFileStorageService _fileStorage;

    public ReviewsController(IMediator mediator, IFileStorageService fileStorage)
    {
        _mediator = mediator;
        _fileStorage = fileStorage;
    }

    /// <summary>
    /// Submit a new review (with optional file upload).
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateReviewCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetByEntity), new { entityId = command.TradeEntityId ?? Guid.Empty }, new { id = result.Data })
            : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Upload evidence file for a review.
    /// </summary>
    [HttpPost("{reviewId:guid}/evidence")]
    [Authorize]
    public async Task<IActionResult> UploadEvidence(Guid reviewId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0)
            return BadRequest(new { errors = new[] { "File is empty." } });

        if (file.Length > 10 * 1024 * 1024) // 10 MB limit
            return BadRequest(new { errors = new[] { "File size must not exceed 10 MB." } });

        // Validate file type (whitelist of allowed extensions)
        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt" };
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            return BadRequest(new { errors = new[] { $"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", allowedExtensions)}" } });

        // Validate content type
        var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp",
            "application/pdf",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain"
        };
        if (!allowedContentTypes.Contains(file.ContentType))
            return BadRequest(new { errors = new[] { $"Content type '{file.ContentType}' is not allowed." } });

        await using var stream = file.OpenReadStream();
        var storagePath = await _fileStorage.UploadFileAsync(stream, file.FileName, file.ContentType, ct);

        return Ok(new { storagePath, fileName = file.FileName, contentType = file.ContentType, fileSizeBytes = file.Length });
    }

    /// <summary>
    /// Get reviews for an entity (public — published reviews only).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetByEntity([FromQuery] Guid entityId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetReviewsByEntityQuery
        {
            TradeEntityId = entityId,
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Get reviews submitted by the current user.
    /// </summary>
    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetByUser([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId is null) return Unauthorized();

        var result = await _mediator.Send(new GetReviewsByUserQuery
        {
            UserId = userId,
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Get pending reviews for moderation queue (service team only).
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> GetPendingQueue([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetPendingReviewsQuery
        {
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Update review status (publish, request revision, etc.).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateReviewStatusRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateReviewStatusCommand
        {
            ReviewId = id,
            NewStatus = request.NewStatus
        }, ct);

        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Edit a review owned by the current user. Edited reviews return to the
    /// moderation queue and must be re-validated by an admin before publishing.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateReviewCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command with { ReviewId = id }, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Delete a review owned by the current user. Deletion is immediate and
    /// does not require admin validation.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteReviewCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Admin approves a pending owner-submitted edit. The edit snapshot is applied
    /// and the review stays Published with the updated content.
    /// </summary>
    [HttpPut("{id:guid}/approve-edit")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> ApproveEdit(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new ApproveReviewEditCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Admin rejects a pending owner-submitted edit. The edit snapshot is discarded
    /// and the review is restored to Published with its original content.
    /// </summary>
    [HttpPut("{id:guid}/reject-edit")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> RejectEdit(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new RejectReviewEditCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    public record UpdateReviewStatusRequest(ReviewStatus NewStatus);
}
