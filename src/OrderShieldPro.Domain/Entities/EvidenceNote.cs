using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Clarification/annotation added by service team to a review.
/// Displayed as the yellow "Clarification" box on Entity Profile screens.
/// </summary>
public class EvidenceNote : AuditableEntity
{
    public Guid ReviewId { get; set; }

    // Authored by service team member (ApplicationUser Id)
    public string AuthoredById { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;
    public VerificationStatus VerificationOutcome { get; set; }
    public bool IsPubliclyVisible { get; set; } = true;

    // Navigation
    public Review Review { get; set; } = null!;
}
