using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.WatchRequests.Commands;
using OrderShieldPro.Application.WatchRequests.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WatchRequestsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;

    public WatchRequestsController(IMediator mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    /// <summary>
    /// Create a watch/investigation request (entity not found in search).
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateWatchRequestCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded
            ? Created(string.Empty, new { id = result.Data })
            : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Check if an existing enquiry exists for the given supplier name.
    /// Returns the existing enquiry info so frontend can show subscribe option.
    /// </summary>
    [HttpGet("check")]
    [Authorize]
    public async Task<IActionResult> CheckExisting([FromQuery] string entityName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(entityName))
            return BadRequest(new { errors = new[] { "Entity name is required." } });

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        var existing = await _context.WatchRequests
            .Include(w => w.Subscribers)
            .Where(w => w.EntityName.ToLower() == entityName.ToLower().Trim())
            .OrderByDescending(w => w.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (existing is null)
            return Ok(new { exists = false });

        var isOwner = existing.RequestedById == userId;
        var isSubscribed = existing.Subscribers.Any(s => s.UserId == userId);

        return Ok(new
        {
            exists = true,
            id = existing.Id,
            status = existing.Status.ToString(),
            replyMessage = existing.ReplyMessage,
            repliedAt = existing.RepliedAt,
            isOwner,
            isSubscribed,
            subscriberCount = existing.Subscribers.Count
        });
    }

    /// <summary>
    /// Subscribe to an existing enquiry to get notified when it's resolved.
    /// </summary>
    [HttpPost("{id:guid}/subscribe")]
    [Authorize]
    public async Task<IActionResult> Subscribe(Guid id, CancellationToken ct)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId is null) return Unauthorized();

        var watchRequest = await _context.WatchRequests
            .Include(w => w.Subscribers)
            .FirstOrDefaultAsync(w => w.Id == id, ct);

        if (watchRequest is null)
            return NotFound(new { errors = new[] { "Enquiry not found." } });

        if (watchRequest.RequestedById == userId)
            return BadRequest(new { errors = new[] { "You are already the requester of this enquiry." } });

        if (watchRequest.Subscribers.Any(s => s.UserId == userId))
            return BadRequest(new { errors = new[] { "You are already subscribed to this enquiry." } });

        _context.WatchRequestSubscribers.Add(new WatchRequestSubscriber
        {
            WatchRequestId = id,
            UserId = userId
        });

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Subscribed successfully." });
    }

    /// <summary>
    /// Get the enquiry SLA setting.
    /// </summary>
    [HttpGet("sla")]
    public async Task<IActionResult> GetSla(CancellationToken ct)
    {
        var setting = await _context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == "enquiry_sla_days", ct);

        return Ok(new { slaDays = setting?.Value ?? "2" });
    }

    /// <summary>
    /// Get watch requests for the current user.
    /// </summary>
    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetByUser([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId is null) return Unauthorized();

        var result = await _mediator.Send(new GetWatchRequestsByUserQuery
        {
            UserId = userId,
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Resolve a watch request (service team only).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] ResolveWatchRequestRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ResolveWatchRequestCommand
        {
            Id = id,
            NewStatus = request.NewStatus,
            ServiceTeamNotes = request.ServiceTeamNotes,
            ResultEntityId = request.ResultEntityId
        }, ct);

        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    public record ResolveWatchRequestRequest(InvestigationStatus NewStatus, string? ServiceTeamNotes, Guid? ResultEntityId);
}
