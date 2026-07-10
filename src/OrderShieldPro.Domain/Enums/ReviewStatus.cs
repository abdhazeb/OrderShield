namespace OrderShieldPro.Domain.Enums;

public enum ReviewStatus
{
    Pending = 0,
    Published = 1,
    Amended = 2,
    Rejected = 3,
    /// <summary>
    /// The review is currently published but has a pending owner-submitted edit
    /// that an admin needs to approve or reject.
    /// </summary>
    PendingEdit = 4
}
