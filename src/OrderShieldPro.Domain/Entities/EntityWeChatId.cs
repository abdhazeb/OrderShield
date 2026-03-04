using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// WeChat ID associated with a trade entity.
/// Supports tracking rebrands — same WeChat used by renamed entities (BRD Section 5).
/// </summary>
public class EntityWeChatId : BaseEntity
{
    public Guid TradeEntityId { get; set; }
    public string WeChatId { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }

    // Navigation
    public TradeEntity TradeEntity { get; set; } = null!;
}
