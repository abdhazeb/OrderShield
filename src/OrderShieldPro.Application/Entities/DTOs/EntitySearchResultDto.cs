using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Entities.DTOs;

/// <summary>
/// Search result DTO — lightweight for list views.
/// </summary>
public record EntitySearchResultDto
{
    public Guid Id { get; init; }
    public string LegalName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public EntityType EntityType { get; init; }
    public string Country { get; init; } = string.Empty;
    public string? Region { get; init; }
    public string? ProductCategories { get; init; }
    public VerificationStatus VerificationStatus { get; init; }
    public int TotalReviewCount { get; init; }
    public int InfoReviewCount { get; init; }
    public int WarningReviewCount { get; init; }
    public int CriticalReviewCount { get; init; }
    public DateTime? LastReviewDate { get; init; }
    public DateTime ListedDate { get; init; }

    /// <summary>
    /// The other/former names this entity is known by — public, and the point of rebrand
    /// tracking. Search matches on these, so a result that matched an old name would
    /// otherwise look unrelated to what was typed.
    /// </summary>
    public IReadOnlyList<string> AlternativeNames { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Phone numbers, populated **only for moderators** — empty for everyone else.
    ///
    /// Search still matches on them for all callers, so a broker who already has a number
    /// can find the entity behind it. What is withheld is the reverse lookup: listing every
    /// number an entity answers on would turn the public directory into a scrapeable
    /// contact database. Moderators need them to work the directory, so they get them here
    /// as well as on <see cref="EntityDetailDto"/>.
    /// </summary>
    public IReadOnlyList<string> PhoneNumbers { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Withheld from public search. Only ever true in results for a moderator, since
    /// hidden entities are filtered out of every other caller's query.
    /// </summary>
    public bool IsHidden { get; init; }
}
