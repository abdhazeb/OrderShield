using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// User request to watch/investigate a supplier not yet in the database.
/// Triggered from the "Enquire About This Supplier" button when search returns no results.
/// </summary>
public class WatchRequest : AuditableEntity
{
    // Requested by (ApplicationUser Id)
    public string RequestedById { get; set; } = string.Empty;

    // Entity details provided by user
    public string EntityName { get; set; } = string.Empty;
    public string? EntityPhone { get; set; }
    public string? EntityWeChat { get; set; }
    public string? EntityWebsite { get; set; }
    public string? EntityCountry { get; set; }
    public string? AdditionalDetails { get; set; }

    // Enquiry checklist — what the user wants to know (stored as comma-separated or JSON)
    public string? EnquiryChecklist { get; set; }

    // Investigation
    public InvestigationStatus Status { get; set; } = InvestigationStatus.Pending;
    public string? AssignedToId { get; set; } // Service team member
    public string? ServiceTeamNotes { get; set; }
    public Guid? ResultEntityId { get; set; } // Entity created as a result, if any
    public DateTime? ResolvedDate { get; set; }

    // Reply from admin/service team to the user
    public string? ReplyMessage { get; set; }
    public DateTime? RepliedAt { get; set; }

    // Navigation
    public ICollection<WatchRequestSubscriber> Subscribers { get; set; } = new List<WatchRequestSubscriber>();
}
