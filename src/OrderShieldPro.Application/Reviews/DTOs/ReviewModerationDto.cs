using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.DTOs;

/// <summary>
/// Everything a moderator needs to judge a single submission before approving or
/// rejecting it — the full submission, who filed it, and the attached evidence.
///
/// Deliberately separate from <see cref="ReviewDto"/>: this carries the reviewer's
/// contact details and verification email, which must never reach the public review
/// timeline. Only ever returned from the moderator-only detail endpoint.
/// </summary>
public record ReviewModerationDto
{
    public Guid Id { get; init; }
    public ReviewStatus Status { get; init; }
    public SeverityLevel Severity { get; init; }
    public bool IsComment { get; init; }

    // ── The entity under review ──────────────────────────────────────────────
    public Guid TradeEntityId { get; init; }
    public string TradeEntityName { get; init; } = string.Empty;
    public string? TradeEntityCountry { get; init; }
    public string? TradeEntityRegion { get; init; }
    public VerificationStatus TradeEntityVerificationStatus { get; init; }
    public bool TradeEntityIsHidden { get; init; }
    public int TradeEntityTotalReviewCount { get; init; }

    // ── Who filed it ─────────────────────────────────────────────────────────
    public string ReviewerId { get; init; } = string.Empty;
    public string? ReviewerName { get; init; }
    public string? ReviewerEmail { get; init; }
    public ReviewerType ReviewerType { get; init; }
    public string TransactionRole { get; init; } = string.Empty;
    public string VerificationEmail { get; init; } = string.Empty;

    // ── The submission ───────────────────────────────────────────────────────
    public string Title { get; init; } = string.Empty;
    public string Narrative { get; init; } = string.Empty;
    public string? Product { get; init; }
    public string? ProductCategory { get; init; }
    public DateTime? IncidentDate { get; init; }
    public decimal? OrderValue { get; init; }

    // ── The counterparty the reviewer actually dealt with ─────────────────────
    public string? ContactName { get; init; }
    public string? ContactPosition { get; init; }
    public string? ContactPhoneUsed { get; init; }
    public string? ContactWeChatUsed { get; init; }

    // ── Evidence ─────────────────────────────────────────────────────────────
    public string? EvidenceLinks { get; init; }
    public IReadOnlyList<EvidenceFileDto> EvidenceFiles { get; init; } = Array.Empty<EvidenceFileDto>();

    /// <summary>All notes, including internal ones — moderators see the full trail.</summary>
    public IReadOnlyList<ModerationNoteDto> EvidenceNotes { get; init; } = Array.Empty<ModerationNoteDto>();

    /// <summary>JSON-serialised ReviewPendingEdit when Status == PendingEdit.</summary>
    public string? PendingEditJson { get; init; }

    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public record ModerationNoteDto
{
    public Guid Id { get; init; }
    public string Summary { get; init; } = string.Empty;
    public VerificationStatus VerificationOutcome { get; init; }
    public bool IsPubliclyVisible { get; init; }
    public string? AuthoredByName { get; init; }
    public DateTime CreatedAt { get; init; }
}
