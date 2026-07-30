using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.Commands;
using OrderShieldPro.Application.Reviews.Queries;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("GeneralPolicy")]
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

    private const long MaxEvidenceFileBytes = 10 * 1024 * 1024; // 10 MB

    private static readonly HashSet<string> AllowedEvidenceExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt" };

    private static readonly HashSet<string> AllowedEvidenceContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp",
        "application/pdf",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain"
    };

    /// <summary>
    /// Attach one or more evidence files to a review. The form field name is "files";
    /// a single file posted under "file" is accepted too.
    /// </summary>
    [HttpPost("{reviewId:guid}/evidence")]
    [Authorize]
    public async Task<IActionResult> UploadEvidence(
        Guid reviewId,
        [FromForm(Name = "files")] IFormFileCollection? files,
        CancellationToken ct)
    {
        // Fall back to whatever the request actually carried so a client posting a single
        // "file" field still works. Evidence is only ever attached through this endpoint,
        // so silently accepting zero files would look like a successful upload.
        var uploads = (files is { Count: > 0 } ? files : Request.Form.Files)
            ?.Where(f => f.Length > 0).ToList() ?? new List<IFormFile>();

        if (uploads.Count == 0)
            return BadRequest(new { errors = new[] { "No files were uploaded." } });

        foreach (var file in uploads)
        {
            if (file.Length > MaxEvidenceFileBytes)
                return BadRequest(new { errors = new[] { $"'{file.FileName}' exceeds the 10 MB limit." } });

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(extension) || !AllowedEvidenceExtensions.Contains(extension))
                return BadRequest(new { errors = new[] { $"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", AllowedEvidenceExtensions)}" } });

            if (!AllowedEvidenceContentTypes.Contains(file.ContentType))
                return BadRequest(new { errors = new[] { $"Content type '{file.ContentType}' is not allowed." } });
        }

        var streams = new List<Stream>(uploads.Count);
        try
        {
            var items = uploads.Select(f =>
            {
                var stream = f.OpenReadStream();
                streams.Add(stream);
                return new EvidenceUpload
                {
                    Content = stream,
                    FileName = Path.GetFileName(f.FileName),
                    ContentType = f.ContentType,
                    FileSizeBytes = f.Length
                };
            }).ToList();

            var result = await _mediator.Send(
                new AttachReviewEvidenceCommand { ReviewId = reviewId, Files = items }, ct);

            return result.Succeeded
                ? Ok(new { fileIds = result.Data })
                : BadRequest(new { result.Errors });
        }
        finally
        {
            foreach (var stream in streams)
                await stream.DisposeAsync();
        }
    }

    /// <summary>
    /// Download an evidence file attached to a review. Restricted to the reviewer who
    /// submitted it and to moderators assessing it.
    /// </summary>
    [HttpGet("{reviewId:guid}/evidence/{fileId:guid}")]
    [Authorize]
    public async Task<IActionResult> DownloadEvidence(Guid reviewId, Guid fileId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetEvidenceFileQuery(reviewId, fileId), ct);
        if (!result.Succeeded || result.Data is null)
            return NotFound(new { error = "File not found." });

        var stream = await _fileStorage.OpenReadAsync(result.Data.StoragePath, ct);
        if (stream is null)
            return NotFound(new { error = "File not found." });

        return File(stream, FileContentTypes.FromFileName(result.Data.FileName), result.Data.FileName);
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
    /// List hidden reviews (service team only) — the "Hidden Content" management screen.
    /// </summary>
    [HttpGet("hidden")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> GetHiddenQueue([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetHiddenReviewsQuery { Page = page, PageSize = pageSize }, ct);
        return Ok(result);
    }

    /// <summary>
    /// Current values of a review for prefilling the edit form. Owner or moderator.
    /// </summary>
    [HttpGet("{reviewId:guid}/edit")]
    [Authorize]
    public async Task<IActionResult> GetForEdit(Guid reviewId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetReviewForEditQuery(reviewId), ct);
        return result.Succeeded
            ? Ok(result.Data)
            : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Full detail of one review for the moderation dossier screen (service team only).
    /// Carries the reviewer's contact details and evidence manifest, so it is never public.
    /// </summary>
    [HttpGet("{reviewId:guid}/moderation")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> GetForModeration(Guid reviewId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetReviewForModerationQuery(reviewId), ct);
        return result.Succeeded
            ? Ok(result.Data)
            : BadRequest(new { result.Errors });
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
