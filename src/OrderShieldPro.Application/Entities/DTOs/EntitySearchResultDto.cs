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
    /// The entity's known phone numbers and its other/former names. Search matches on both
    /// (see <c>TradeEntityRepository.SearchAsync</c>), so a result that only matched on a
    /// phone number or an old name would otherwise look unrelated to what was typed —
    /// showing them is what makes the hit explicable.
    /// </summary>
    public IReadOnlyList<string> PhoneNumbers { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> AlternativeNames { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Withheld from public search. Only ever true in results for a moderator, since
    /// hidden entities are filtered out of every other caller's query.
    /// </summary>
    public bool IsHidden { get; init; }
}
