using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Subscription plan definition (Free, Pro).
/// Displayed in the User Profile subscription plans modal.
/// </summary>
public class SubscriptionPlan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public SubscriptionTier Tier { get; set; }
    public decimal MonthlyPrice { get; set; }
    public string? Description { get; set; }

    // Limits
    public int MaxReviewsPerMonth { get; set; } // -1 for unlimited
    public int MaxWatchlistSize { get; set; }    // -1 for unlimited
    public bool HasPriorityVerification { get; set; }
    public bool HasAdvancedFilters { get; set; }
    public bool HasApiAccess { get; set; }
    public bool HasDedicatedSupport { get; set; }

    // Features list for display
    public string? FeaturesJson { get; set; } // JSON array of feature strings

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
