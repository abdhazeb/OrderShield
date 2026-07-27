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

    /// <summary>
    /// When a SuperAdmin approved this registration; null means it never has been.
    /// This is what separates the two reasons an account can be inactive: a brand-new
    /// registration awaiting approval (ApprovedAt == null) versus an approved account a
    /// moderator later froze (ApprovedAt set, IsActive false). They must stay distinct —
    /// the pending-registration queue keys off ApprovedAt, so without it a frozen user
    /// would resurface as a new signup awaiting approval, and "rejecting" them would
    /// delete a real account.
    /// </summary>
    public DateTime? ApprovedAt { get; set; }

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
