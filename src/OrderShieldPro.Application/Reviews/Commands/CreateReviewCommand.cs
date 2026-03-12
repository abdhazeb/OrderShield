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
