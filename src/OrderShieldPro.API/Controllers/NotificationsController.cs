using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Notifications.Commands;
using OrderShieldPro.Application.Notifications.Queries;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator)
    {
        _mediator = mediator;
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
    /// Mark a notification as read.
    /// </summary>
    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new MarkNotificationAsReadCommand(id), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }
}
