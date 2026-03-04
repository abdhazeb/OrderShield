using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Domain.Interfaces;

public interface IReviewRepository
{
    Task<Review?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Review?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<Review> Items, int TotalCount)> GetByEntityIdAsync(
        Guid entityId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<Review> Items, int TotalCount)> GetByUserIdAsync(
        string userId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<Review> Items, int TotalCount)> GetPendingAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<Review> AddAsync(Review review, CancellationToken cancellationToken = default);

    Task UpdateAsync(Review review, CancellationToken cancellationToken = default);

    Task<int> GetCountByEntityAndSeverityAsync(
        Guid entityId,
        SeverityLevel severity,
        CancellationToken cancellationToken = default);
}
