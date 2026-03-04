using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Notifications.Commands;

/// <summary>
/// Mark a notification as read.
/// </summary>
public record MarkNotificationAsReadCommand(Guid NotificationId) : IRequest<Result>;
