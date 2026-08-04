using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Submit a new review for a trade entity.
/// Matches all fields from the Submit Review form in the prototypes.
/// </summary>
public record CreateReviewCommand : IRequest<Result<Guid>>
{
    // Entity being reviewed (either ID or Name must be provided)
    public Guid? TradeEntityId { get; init; }
    public string? EntityName { get; init; }

    /// <summary>
    /// Other names the reviewer knows this entity by — an English trading name against a
    /// Chinese legal name, a rebrand, a name on the invoice that differs from the one on
    /// the website. Stored as <see cref="Domain.Entities.EntityHistoricalName"/> rows,
    /// which entity search already matches on, so the next broker searching any of these
    /// names finds the same entity rather than filing a duplicate.
    /// </summary>
    public List<string> AlternativeEntityNames { get; init; } = new();

    /// <summary>
    /// Additional numbers the entity was reached on, beyond
    /// <see cref="ContactPhoneUsed"/>. Added to the entity's searchable phone list for the
    /// same reason — a scammer's phone number outlives the company name.
    /// </summary>
    public List<string> AdditionalPhoneNumbers { get; init; } = new();

    // Reviewer info
    public ReviewerType ReviewerType { get; init; }
    public string TransactionRole { get; init; } = string.Empty;

    // Review details
    public SeverityLevel Severity { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Narrative { get; init; } = string.Empty;
    public string? Product { get; init; }
    public string? ProductCategory { get; init; }
    public DateTime? IncidentDate { get; init; }
    public decimal? OrderValue { get; init; }

    // Contact info used in the transaction
    public string? ContactName { get; init; }
    /// <summary>The contact's role at the entity (owner, purchasing manager, …).</summary>
    public string? ContactPosition { get; init; }
    public string? ContactPhoneUsed { get; init; }
    public string? ContactWeChatUsed { get; init; }

    // Supplier location (for new suppliers)
    public string? SupplierCountry { get; init; }
    public string? SupplierProvince { get; init; }

    // Comment vs Review
    public bool IsComment { get; init; }

    // Evidence
    public string? EvidenceLinks { get; init; }

    // Verification email (not displayed publicly)
    public string VerificationEmail { get; init; } = string.Empty;
}
