using Microsoft.AspNetCore.Identity;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Infrastructure.Identity;

/// <summary>
/// Application user extending ASP.NET Core Identity.
/// Stores user profile data visible in the User Profile screens.
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Buyer;
    public string? Region { get; set; }
    public string? Organization { get; set; }
    public Language LanguagePreference { get; set; } = Language.En;

    // Subscription
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;
    public DateTime? SubscriptionExpiryDate { get; set; }

    // Notification preferences stored as JSON
    public string? NotificationPreferencesJson { get; set; }

    // Credibility signal (BRD Section 5: reviewer trust score)
    public int TrustScore { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Business verification
    public string? BusinessName { get; set; }
    public string? LicenseAddress { get; set; }
    public string? BusinessPhone { get; set; }
    public string? BusinessLicenseFilePath { get; set; }
    public bool IsBusinessVerified { get; set; }

    // Refresh token for JWT
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }

    // Navigation properties
    public ICollection<UserFollowedEntity> FollowedEntities { get; set; } = new List<UserFollowedEntity>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<WatchRequest> WatchRequests { get; set; } = new List<WatchRequest>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
