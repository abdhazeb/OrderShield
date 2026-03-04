using OrderShieldPro.Domain.Common;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Queued admin action awaiting SuperAdmin approval.
/// When an Admin performs publish/reject/edit/delete on a review or replies to an enquiry,
/// the action is stored here instead of being applied immediately.
/// SuperAdmin approves or rejects it.
/// </summary>
public class PendingAdminAction : BaseEntity
{
    public AdminActionType ActionType { get; set; }

    /// <summary>Type of target: "Review", "WatchRequest", etc.</summary>
    public string TargetType { get; set; } = string.Empty;

    /// <summary>ID of the target entity (Review Id, WatchRequest Id, etc.)</summary>
    public Guid TargetId { get; set; }

    /// <summary>JSON payload for the proposed change (edit content, reply text, new status, etc.)</summary>
    public string? Payload { get; set; }

    /// <summary>Admin who proposed this action.</summary>
    public string ProposedById { get; set; } = string.Empty;

    public AdminActionStatus Status { get; set; } = AdminActionStatus.Pending;

    /// <summary>SuperAdmin who reviewed it (null while pending).</summary>
    public string? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
}
