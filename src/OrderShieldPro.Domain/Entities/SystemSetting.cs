using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// Key-value system settings configurable by SuperAdmin.
/// Examples: enquiry_sla_days, subscription pricing, feature flags.
/// </summary>
public class SystemSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? UpdatedById { get; set; }
}
