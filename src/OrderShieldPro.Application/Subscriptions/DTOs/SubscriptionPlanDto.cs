using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.DTOs;

public record SubscriptionPlanDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public SubscriptionTier Tier { get; init; }
    public decimal MonthlyPrice { get; init; }
    public string? Description { get; init; }
    public int MaxReviewsPerMonth { get; init; }
    public int MaxWatchlistSize { get; init; }
    public bool HasPriorityVerification { get; init; }
    public bool HasAdvancedFilters { get; init; }
    public bool HasApiAccess { get; init; }
    public bool HasDedicatedSupport { get; init; }
    public string? FeaturesJson { get; init; }
    public int SortOrder { get; init; }
}

public record CurrentSubscriptionDto
{
    public SubscriptionTier Tier { get; init; }
    public string PlanName { get; init; } = string.Empty;
    public DateTime? ExpiryDate { get; init; }
}
