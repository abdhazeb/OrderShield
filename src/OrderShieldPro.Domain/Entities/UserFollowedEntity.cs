namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Join table for the many-to-many relationship between users and followed entities.
/// Used by the "Follow" button on Entity Profile and "My Watchlist" in User Profile.
/// </summary>
public class UserFollowedEntity
{
    // ApplicationUser Id
    public string UserId { get; set; } = string.Empty;

    public Guid TradeEntityId { get; set; }
    public DateTime FollowedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public TradeEntity TradeEntity { get; set; } = null!;
}
