using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.DTOs;

/// <summary>
/// Review DTO for list views (entity profile timeline, user's reviews).
/// </summary>
public record ReviewDto
{
    public Guid Id { get; init; }
    public Guid TradeEntityId { get; init; }
    public string TradeEntityName { get; init; } = string.Empty;
    public string ReviewerId { get; init; } = string.Empty;
    public string? ReviewerName { get; init; }
    public ReviewerType ReviewerType { get; init; }
    public SeverityLevel Severity { get; init; }
    public ReviewStatus Status { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Narrative { get; init; } = string.Empty;
    public string? Product { get; init; }
    public string? ProductCategory { get; init; }
    public DateTime? IncidentDate { get; init; }
    public decimal? OrderValue { get; init; }
    public string? EvidenceLinks { get; init; }
    /// <summary>JSON-serialised ReviewPendingEdit when Status == PendingEdit.</summary>
    public string? PendingEditJson { get; init; }
    public IReadOnlyList<EvidenceFileDto> EvidenceFiles { get; init; } = Array.Empty<EvidenceFileDto>();
    public IReadOnlyList<EvidenceNoteDto> PublicEvidenceNotes { get; init; } = Array.Empty<EvidenceNoteDto>();
    public DateTime CreatedAt { get; init; }
}

public record EvidenceFileDto
{
    public Guid Id { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
}

public record EvidenceNoteDto
{
    public Guid Id { get; init; }
    public string Summary { get; init; } = string.Empty;
    public VerificationStatus VerificationOutcome { get; init; }
    public DateTime CreatedAt { get; init; }
}
