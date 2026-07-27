using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Domain notification dispatch — used by handlers and controllers to push
/// in-app notifications to a single user or to all SuperAdmins.
/// Implementations persist the notification(s) and call SaveChanges themselves.
/// </summary>
public interface INotificationService
{
    /// <param name="title">English fallback shown only when <paramref name="templateKey"/> is null.</param>
    /// <param name="message">English fallback shown only when <paramref name="templateKey"/> is null.</param>
    /// <param name="templateKey">
    /// Key of a localized template under notification.templates in the frontend i18n
    /// files. Omit for notifications whose content is inherently free text (e.g. a
    /// moderator's direct message) — those cannot be translated after the fact.
    /// </param>
    /// <param name="subject">The single piece of free text the template interpolates.</param>
    Task NotifyUserAsync(
        string userId,
        NotificationType type,
        string title,
        string message,
        Guid? referenceEntityId = null,
        Guid? referenceReviewId = null,
        string? templateKey = null,
        string? subject = null,
        CancellationToken cancellationToken = default);

    /// <param name="title">English fallback shown only when <paramref name="templateKey"/> is null.</param>
    /// <param name="message">English fallback shown only when <paramref name="templateKey"/> is null.</param>
    /// <param name="templateKey">Key of a localized template under notification.templates in the frontend i18n files.</param>
    /// <param name="subject">The single piece of free text the template interpolates.</param>
    Task NotifySuperAdminsAsync(
        NotificationType type,
        string title,
        string message,
        Guid? referenceEntityId = null,
        Guid? referenceReviewId = null,
        string? templateKey = null,
        string? subject = null,
        CancellationToken cancellationToken = default);
}
