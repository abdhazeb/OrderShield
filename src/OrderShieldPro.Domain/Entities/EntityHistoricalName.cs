using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Tracks historical/previous names of an entity to detect rebranding.
/// </summary>
public class EntityHistoricalName : BaseEntity
{
    public Guid TradeEntityId { get; set; }
    public string PreviousName { get; set; } = string.Empty;
    public DateTime? ChangedDate { get; set; }

    // Navigation
    public TradeEntity TradeEntity { get; set; } = null!;
}
