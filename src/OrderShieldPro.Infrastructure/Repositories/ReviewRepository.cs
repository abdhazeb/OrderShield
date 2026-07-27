using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Infrastructure.Repositories;

public class ReviewRepository : IReviewRepository
{
    private readonly ApplicationDbContext _context;

    public ReviewRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Review?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Reviews
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<Review?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Reviews
            .Include(r => r.EvidenceFiles)
            .Include(r => r.EvidenceNotes)
            .Include(r => r.TradeEntity)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public async Task<(IReadOnlyList<Review> Items, int TotalCount)> GetByEntityIdAsync(
        Guid entityId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _context.Reviews
            .Include(r => r.EvidenceNotes.Where(n => n.IsPubliclyVisible))
            .Where(r => r.TradeEntityId == entityId && r.Status == ReviewStatus.Published)
            .OrderByDescending(r => r.IncidentDate);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<Review> Items, int TotalCount)> GetByUserIdAsync(
        string userId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _context.Reviews
            .Include(r => r.TradeEntity)
            .Where(r => r.ReviewerId == userId)
            .OrderByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<Review> Items, int TotalCount)> GetPendingAsync(
        int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _context.Reviews
            .Include(r => r.TradeEntity)
            .Include(r => r.EvidenceFiles)
            .Where(r => r.Status == ReviewStatus.Pending || r.Status == ReviewStatus.PendingEdit)
            .OrderBy(r => r.CreatedAt); // Oldest first for FIFO moderation

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<Review> Items, int TotalCount)> GetHiddenAsync(
        int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _context.Reviews
            .Include(r => r.TradeEntity)
            .Where(r => r.Status == ReviewStatus.Hidden)
            .OrderByDescending(r => r.UpdatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<Review> AddAsync(Review review, CancellationToken cancellationToken = default)
    {
        await _context.Reviews.AddAsync(review, cancellationToken);
        return review;
    }

    public Task UpdateAsync(Review review, CancellationToken cancellationToken = default)
    {
        _context.Reviews.Update(review);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Review review, CancellationToken cancellationToken = default)
    {
        _context.Reviews.Remove(review);
        return Task.CompletedTask;
    }

    public async Task<int> GetCountByEntityAndSeverityAsync(
        Guid entityId, SeverityLevel severity, CancellationToken cancellationToken = default)
    {
        return await _context.Reviews
            .Where(r => r.TradeEntityId == entityId &&
                        r.Severity == severity &&
                        r.Status == ReviewStatus.Published)
            .CountAsync(cancellationToken);
    }
}
