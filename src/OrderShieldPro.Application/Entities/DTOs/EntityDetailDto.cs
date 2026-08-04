using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Entities.DTOs;

/// <summary>
/// Full entity detail DTO — used on Entity Profile page.
/// </summary>
public record EntityDetailDto
{
    public Guid Id { get; init; }
    public string LegalName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public EntityType EntityType { get; init; }

    public string Country { get; init; } = string.Empty;
    public string? Region { get; init; }
    public string? City { get; init; }

    public string? ProductCategories { get; init; }

    public VerificationStatus VerificationStatus { get; init; }
    public int VerificationScore { get; init; }
    public string? ExternalRegistryLinks { get; init; }

    // Stats
    public int TotalReviewCount { get; init; }
    public int InfoReviewCount { get; init; }
    public int WarningReviewCount { get; init; }
    public int CriticalReviewCount { get; init; }
    public DateTime? LastReviewDate { get; init; }
    public DateTime ListedDate { get; init; }

    /// <summary>
    /// Contact details, populated **only for moderators** — they stay empty for everyone
    /// else rather than being hidden in the template, because a value in the JSON is public
    /// whether or not a template renders it.
    ///
    /// Entity search still matches on phone numbers, so someone who already has a number can
    /// find the entity behind it. What is withheld is the reverse lookup: opening an entity
    /// and harvesting every number it answers on. Moderators need them to judge a report and
    /// to edit the entity, so they get the real values.
    /// </summary>
    public IReadOnlyList<string> PhoneNumbers { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> WeChatIds { get; init; } = Array.Empty<string>();

    /// <summary>Other/former names — public, and the point of rebrand tracking.</summary>
    public IReadOnlyList<string> HistoricalNames { get; init; } = Array.Empty<string>();

    // Followers
    public int FollowerCount { get; init; }
    public bool IsFollowedByCurrentUser { get; init; }

    /// <summary>
    /// True when the entity is withheld from public search and profile pages. Only
    /// moderators ever receive a DTO with this set — the public gets a 404 instead.
    /// </summary>
    public bool IsHidden { get; init; }
}
