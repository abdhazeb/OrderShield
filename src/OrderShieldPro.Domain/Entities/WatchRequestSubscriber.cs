using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Tracks users who subscribed to receive the reply of an existing enquiry.
/// When a second user enquires about the same supplier that already has a pending/in-progress
/// enquiry, they can subscribe instead of creating a duplicate.
/// </summary>
public class WatchRequestSubscriber : BaseEntity
{
    public Guid WatchRequestId { get; set; }
    public string UserId { get; set; } = string.Empty;

    // Navigation
    public WatchRequest? WatchRequest { get; set; }
}
