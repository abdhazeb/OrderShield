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

    // Contact info
    public IReadOnlyList<string> PhoneNumbers { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> WeChatIds { get; init; } = Array.Empty<string>();
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
