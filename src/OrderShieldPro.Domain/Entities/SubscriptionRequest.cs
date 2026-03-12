using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Represents a user's request to subscribe or renew their subscription.
/// Admin verifies payment proof and approves/rejects the request.
/// </summary>
public class SubscriptionRequest : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public SubscriptionTier RequestedTier { get; set; } = SubscriptionTier.Pro;
    public int DurationYears { get; set; } = 1; // 1, 2, or 3
    public decimal TotalAmount { get; set; }

    // Payment proof
    public string? PaymentProofFileName { get; set; }
    public string? PaymentProofStoragePath { get; set; }
    public string? PaymentNotes { get; set; }

    // Status
    public SubscriptionRequestStatus Status { get; set; } = SubscriptionRequestStatus.Pending;
    public string? AdminNotes { get; set; }
    public string? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
}
