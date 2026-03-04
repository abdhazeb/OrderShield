using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Notifications.DTOs;

namespace OrderShieldPro.Application.Notifications.Queries;

/// <summary>
/// Get notifications for the current user.
/// </summary>
public record GetUserNotificationsQuery : IRequest<PaginatedList<NotificationDto>>
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public bool UnreadOnly { get; init; }
}
