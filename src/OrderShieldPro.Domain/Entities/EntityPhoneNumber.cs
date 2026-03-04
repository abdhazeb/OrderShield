using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Phone number associated with a trade entity.
/// Supports array storage for scam prevention: same phone used by renamed entities.
/// </summary>
public class EntityPhoneNumber : BaseEntity
{
    public Guid TradeEntityId { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }

    // Navigation
    public TradeEntity TradeEntity { get; set; } = null!;
}
