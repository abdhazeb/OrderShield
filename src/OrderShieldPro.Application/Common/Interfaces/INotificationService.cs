using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Domain notification dispatch — used by handlers and controllers to push
/// in-app notifications to a single user or to all SuperAdmins.
/// Implementations persist the notification(s) and call SaveChanges themselves.
/// </summary>
public interface INotificationService
{
    Task NotifyUserAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        Guid? referenceEntityId = null,
        Guid? referenceReviewId = null,
        CancellationToken cancellationToken = default);

    Task NotifySuperAdminsAsync(
        NotificationType type,
        string title,
        string message,
        Guid? referenceEntityId = null,
        Guid? referenceReviewId = null,
        CancellationToken cancellationToken = default);
}
