using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Subscriptions.Commands;
using OrderShieldPro.Application.Subscriptions.Queries;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IFileStorageService _fileStorage;

    public SubscriptionsController(IMediator mediator, IFileStorageService fileStorage)
    {
        _mediator = mediator;
        _fileStorage = fileStorage;
    }

    /// <summary>
    /// Get all available subscription plans (public).
    /// </summary>
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPlansQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Get subscription pricing with duration options (public).
    /// </summary>
    [HttpGet("pricing")]
    public async Task<IActionResult> GetPricing(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetSubscriptionPricingQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Get the current user's subscription.
    /// </summary>
    [HttpGet("current")]
    [Authorize]
    public async Task<IActionResult> GetCurrentPlan(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetCurrentPlanQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Submit a subscription request with payment proof.
    /// </summary>
    [HttpPost("request")]
    [Authorize]
    public async Task<IActionResult> CreateRequest(
        [FromForm] SubscriptionTier requestedTier,
        [FromForm] int durationYears,
        [FromForm] string? paymentNotes,
        IFormFile paymentProof,
        CancellationToken ct)
    {
        if (paymentProof == null || paymentProof.Length == 0)
            return BadRequest(new { errors = new[] { "Payment proof file is required." } });

        if (paymentProof.Length > 10 * 1024 * 1024)
            return BadRequest(new { errors = new[] { "File size must not exceed 10 MB." } });

        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".pdf" };
        var extension = Path.GetExtension(paymentProof.FileName);
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            return BadRequest(new { errors = new[] { $"File type '{extension}' is not allowed. Allowed: {string.Join(", ", allowedExtensions)}" } });

        await using var stream = paymentProof.OpenReadStream();
        var storagePath = await _fileStorage.UploadFileAsync(stream, paymentProof.FileName, paymentProof.ContentType, ct);

        var result = await _mediator.Send(new CreateSubscriptionRequestCommand
        {
            RequestedTier = requestedTier,
            DurationYears = durationYears,
            PaymentProofFileName = paymentProof.FileName,
            PaymentProofStoragePath = storagePath,
            PaymentNotes = paymentNotes
        }, ct);

        return result.Succeeded
            ? Ok(new { id = result.Data })
            : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Download a subscription payment proof file.
    /// </summary>
    [HttpGet("download/{fileName}")]
    [Authorize]
    public IActionResult DownloadFile(string fileName)
    {
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        var filePath = Path.Combine(uploadsPath, fileName);
        if (!System.IO.File.Exists(filePath))
            return NotFound(new { error = "File not found." });

        var contentType = "application/octet-stream";
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".pdf" => "application/pdf",
            _ => contentType
        };

        var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        return File(stream, contentType, fileName);
    }

    /// <summary>
    /// Get the current user's subscription request history.
    /// </summary>
    [HttpGet("my-requests")]
    [Authorize]
    public async Task<IActionResult> GetMyRequests(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMySubscriptionRequestsQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Admin: Get all subscription requests.
    /// </summary>
    [HttpGet("pending-requests")]
    [Authorize]
    public async Task<IActionResult> GetPendingRequests(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPendingSubscriptionRequestsQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Admin: Approve a subscription request.
    /// </summary>
    [HttpPost("approve/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Approve(Guid id, [FromBody] AdminActionRequest? request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ApproveSubscriptionRequestCommand(id, request?.AdminNotes), ct);
        return result.Succeeded ? Ok() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Admin: Reject a subscription request.
    /// </summary>
    [HttpPost("reject/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Reject(Guid id, [FromBody] AdminActionRequest? request, CancellationToken ct)
    {
        var result = await _mediator.Send(new RejectSubscriptionRequestCommand(id, request?.AdminNotes), ct);
        return result.Succeeded ? Ok() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Change subscription plan (legacy endpoint).
    /// </summary>
    [HttpPost("change")]
    [Authorize]
    public async Task<IActionResult> ChangePlan([FromBody] ChangePlanRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ChangePlanCommand(request.NewTier), ct);
        return result.Succeeded ? Ok() : BadRequest(new { result.Errors });
    }

    public record ChangePlanRequest(SubscriptionTier NewTier);
    public record AdminActionRequest(string? AdminNotes);
}
