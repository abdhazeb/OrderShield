using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Notifications.Commands;
using OrderShieldPro.Application.Notifications.Queries;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("GeneralPolicy")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(IMediator mediator, IApplicationDbContext context, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _context = context;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Get notifications for the current user.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetByUser(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool unreadOnly = false,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetUserNotificationsQuery
        {
            Page = page,
            PageSize = pageSize,
            UnreadOnly = unreadOnly
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Unread notification count for the current user (for the bell badge).
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_currentUser.UserId))
            return Ok(new { count = 0 });

        var count = await _context.Notifications
            .CountAsync(n => n.UserId == _currentUser.UserId && !n.IsRead, ct);

        return Ok(new { count });
    }

    /// <summary>
    /// Mark a notification as read.
    /// </summary>
    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new MarkNotificationAsReadCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Mark all notifications for the current user as read.
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_currentUser.UserId))
            return Unauthorized();

        var unread = await _context.Notifications
            .Where(n => n.UserId == _currentUser.UserId && !n.IsRead)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { updated = unread.Count });
    }
}
