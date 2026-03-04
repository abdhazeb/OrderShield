using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Interfaces;

public interface ITradeEntityRepository
{
    Task<TradeEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<TradeEntity?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<TradeEntity> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        EntityType? entityType,
        string? country,
        string? productCategory,
        SeverityLevel? severityFilter,
        int page,
        int pageSize,
        string? sortBy = null,
        CancellationToken cancellationToken = default);

    Task<TradeEntity> AddAsync(TradeEntity entity, CancellationToken cancellationToken = default);

    Task UpdateAsync(TradeEntity entity, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Search by phone number or WeChat ID across all entities (scam/rebrand detection).
    /// </summary>
    Task<IReadOnlyList<TradeEntity>> FindByContactInfoAsync(
        string? phoneNumber,
        string? weChatId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Find entity by exact legal name (case-insensitive).
    /// </summary>
    Task<TradeEntity?> FindByNameAsync(string legalName, CancellationToken cancellationToken = default);
}
