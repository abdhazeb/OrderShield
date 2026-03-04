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
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    // Link to related entity/review
    public Guid? ReferenceEntityId { get; set; }
    public Guid? ReferenceReviewId { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
}
