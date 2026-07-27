using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Notification sent to a user about events they care about.
/// Displayed via the notification bell icon in the app header.
/// </summary>
public class Notification : BaseEntity
{
    // Recipient (ApplicationUser Id)
    public string UserId { get; set; } = string.Empty;

    public NotificationType Type { get; set; }

    /// <summary>
    /// English fallback text, kept for notifications that have no <see cref="TemplateKey"/>
    /// (e.g. a moderator's free-text message) and as a safety net for older clients.
    /// </summary>
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Identifies which localized template the frontend should render instead of
    /// <see cref="Title"/>/<see cref="Message"/>. Null for notifications whose content is
    /// inherently free text (e.g. a moderator's direct message to a reviewer), which
    /// cannot be translated after the fact and are shown as authored.
    /// </summary>
    public string? TemplateKey { get; set; }

    /// <summary>
    /// The single piece of free text substituted into the template named by
    /// <see cref="TemplateKey"/> — a review title, an entity name, or similar. The
    /// template itself is fully translated; only this value is user-authored.
    /// </summary>
    public string? Subject { get; set; }

    // Link to related entity/review
    public Guid? ReferenceEntityId { get; set; }
    public Guid? ReferenceReviewId { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
}
