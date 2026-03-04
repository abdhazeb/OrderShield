using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Represents a supplier or broker entity that can be reviewed.
/// Maps to the Entity Profile screens in both prototypes.
/// </summary>
public class TradeEntity : AuditableEntity
{
    public string LegalName { get; set; } = string.Empty;
    public string? TradeName { get; set; }
    public EntityType EntityType { get; set; }

    // Location
    public string Country { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? City { get; set; }

    // Categorization
    public string? ProductCategories { get; set; } // Comma-separated or JSON array

    // Contact info — arrays for tracking rebrands (BRD requirement)
    public ICollection<EntityPhoneNumber> PhoneNumbers { get; set; } = new List<EntityPhoneNumber>();
    public ICollection<EntityWeChatId> WeChatIds { get; set; } = new List<EntityWeChatId>();

    // Historical names for rebrand tracking (BRD Section 6)
    public ICollection<EntityHistoricalName> HistoricalNames { get; set; } = new List<EntityHistoricalName>();

    // Verification
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Unverified;
    public int VerificationScore { get; set; }
    public string? ExternalRegistryLinks { get; set; } // JSON array of registry URLs

    // Stats (denormalized for performance)
    public int TotalReviewCount { get; set; }
    public int InfoReviewCount { get; set; }
    public int WarningReviewCount { get; set; }
    public int CriticalReviewCount { get; set; }
    public DateTime? LastReviewDate { get; set; }
    public DateTime ListedDate { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<UserFollowedEntity> Followers { get; set; } = new List<UserFollowedEntity>();
}
