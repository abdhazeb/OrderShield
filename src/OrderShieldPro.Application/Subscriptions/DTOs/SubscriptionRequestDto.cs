using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.DTOs;

public record SubscriptionRequestDto
{
    public Guid Id { get; init; }
    public string UserId { get; init; } = string.Empty;
    public string UserName { get; init; } = string.Empty;
    public string UserEmail { get; init; } = string.Empty;
    public SubscriptionTier RequestedTier { get; init; }
    public int DurationYears { get; init; }
    public decimal TotalAmount { get; init; }
    public string? PaymentProofFileName { get; init; }
    public string? PaymentProofStoragePath { get; init; }
    public string? PaymentNotes { get; init; }
    public SubscriptionRequestStatus Status { get; init; }
    public string? AdminNotes { get; init; }
    public string? ReviewedById { get; init; }
    public string? ReviewedByName { get; init; }
    public DateTime? ReviewedAt { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record SubscriptionPricingDto
{
    public SubscriptionTier Tier { get; init; }
    public string PlanName { get; init; } = string.Empty;
    public decimal AnnualPrice { get; init; }
    public List<DurationOption> Options { get; init; } = new();
}

public record DurationOption
{
    public int Years { get; init; }
    public decimal TotalPrice { get; init; }
    public decimal DiscountPercent { get; init; }
    public decimal SavedAmount { get; init; }
}
