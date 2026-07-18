using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// A review submitted by a broker or buyer about a trade entity.
/// Maps to the Submit Review form and Review Timeline in prototypes.
/// </summary>
public class Review : AuditableEntity
{
    // Entity being reviewed
    public Guid TradeEntityId { get; set; }

    // Reviewer (ApplicationUser Id stored as string to match Identity)
    public string ReviewerId { get; set; } = string.Empty;

    // Review classification
    public ReviewerType ReviewerType { get; set; }
    public string TransactionRole { get; set; } = string.Empty; // e.g., "Broker reviewing Supplier"
    public SeverityLevel Severity { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;

    // Content (matching submit form fields)
    public string Title { get; set; } = string.Empty;
    public string Narrative { get; set; } = string.Empty; // Min 100 chars
    public string? Product { get; set; }
    public string? ProductCategory { get; set; }
    public DateTime? IncidentDate { get; set; }
    public decimal? OrderValue { get; set; }

    // Contact info used in the transaction (for rebrand cross-referencing)
    public string? ContactName { get; set; }
    public string? ContactPhoneUsed { get; set; }
    public string? ContactWeChatUsed { get; set; }

    // Evidence
    public string? EvidenceLinks { get; set; } // JSON array of URLs
    public ICollection<ReviewEvidenceFile> EvidenceFiles { get; set; } = new List<ReviewEvidenceFile>();

    // Verification email (never displayed publicly)
    public string VerificationEmail { get; set; } = string.Empty;

    /// <summary>
    /// JSON blob that stores the owner's pending edit when a published review
    /// has been edited but not yet approved by an admin.  Null when there is
    /// no pending edit.  Serialised as ReviewPendingEdit.
    ///
    /// Marked [NotMapped] while running without the matching DB migration
    /// to avoid SQL errors in local development. Add the corresponding
    /// migration to persist this field in production.
    /// </summary>
    [NotMapped]
    public string? PendingEditJson { get; set; }

    // Navigation
    public TradeEntity TradeEntity { get; set; } = null!;
    public ICollection<EvidenceNote> EvidenceNotes { get; set; } = new List<EvidenceNote>();
}
