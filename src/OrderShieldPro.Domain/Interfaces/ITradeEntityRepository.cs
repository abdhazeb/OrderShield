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
        bool includeHidden = false,
        CancellationToken cancellationToken = default);

    Task<TradeEntity> AddAsync(TradeEntity entity, CancellationToken cancellationToken = default);

    Task UpdateAsync(TradeEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently removes an entity. Callers must ensure it has no reviews first —
    /// the Reviews foreign key is Restrict, so the database will reject the delete.
    /// </summary>
    Task RemoveAsync(TradeEntity entity, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Entities a moderator hid from public search/profile, most recently hidden first —
    /// for the admin "Hidden Content" management screen.
    /// </summary>
    Task<(IReadOnlyList<TradeEntity> Items, int TotalCount)> GetHiddenAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Search by phone number or WeChat ID across all entities (scam/rebrand detection).
    /// </summary>
    Task<IReadOnlyList<TradeEntity>> FindByContactInfoAsync(
        string? phoneNumber,
        string? weChatId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Find an entity by any exact name it is known by (case-insensitive): its legal name
    /// first, then its trade name or one of its historical/alternative names. Matching the
    /// alternatives is what stops a reviewer who knows a supplier only by its other name
    /// from creating a duplicate record for it.
    /// </summary>
    Task<TradeEntity?> FindByNameAsync(string legalName, CancellationToken cancellationToken = default);
}
