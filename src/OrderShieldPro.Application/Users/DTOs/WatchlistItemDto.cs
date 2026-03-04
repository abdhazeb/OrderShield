using OrderShieldPro.Application.Entities.DTOs;

namespace OrderShieldPro.Application.Users.DTOs;

public record WatchlistItemDto
{
    public Guid TradeEntityId { get; init; }
    public string LegalName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public string Country { get; init; } = string.Empty;
    public int TotalReviewCount { get; init; }
    public int CriticalReviewCount { get; init; }
    public DateTime FollowedAt { get; init; }
}
