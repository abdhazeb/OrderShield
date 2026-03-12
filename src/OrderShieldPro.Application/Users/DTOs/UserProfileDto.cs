using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Users.DTOs;

public record UserProfileDto
{
    public string UserId { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public UserRole Role { get; init; }
    public string? Region { get; init; }
    public Language LanguagePreference { get; init; }
    public SubscriptionTier SubscriptionTier { get; init; }
    public DateTime? SubscriptionExpiryDate { get; init; }
    public int TrustScore { get; init; }
    public int ReviewCount { get; init; }
    public int WatchlistCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? PhoneNumber { get; init; }
    public string? BusinessName { get; init; }
    public string? LicenseAddress { get; init; }
    public string? BusinessPhone { get; init; }
    public string? BusinessLicenseFilePath { get; init; }
    public bool IsBusinessVerified { get; init; }
}
