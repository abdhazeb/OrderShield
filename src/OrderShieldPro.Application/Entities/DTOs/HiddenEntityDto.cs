using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Entities.DTOs;

/// <summary>
/// Lightweight row for the admin "Hidden Content" screen — entities a moderator withdrew
/// from public search and profile pages.
/// </summary>
public record HiddenEntityDto
{
    public Guid Id { get; init; }
    public string LegalName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public EntityType EntityType { get; init; }
    public string Country { get; init; } = string.Empty;
    public int TotalReviewCount { get; init; }
    public DateTime? HiddenAt { get; init; }
    public string? HiddenByName { get; init; }
}
