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
    /// Withheld from public search. Only ever true in results for a moderator, since
    /// hidden entities are filtered out of every other caller's query.
    /// </summary>
    public bool IsHidden { get; init; }
}
