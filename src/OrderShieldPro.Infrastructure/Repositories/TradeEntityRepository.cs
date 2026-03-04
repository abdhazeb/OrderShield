using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Infrastructure.Repositories;

public class TradeEntityRepository : ITradeEntityRepository
{
    private readonly ApplicationDbContext _context;

    public TradeEntityRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TradeEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.TradeEntities
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<TradeEntity?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.TradeEntities
            .Include(e => e.PhoneNumbers)
            .Include(e => e.WeChatIds)
            .Include(e => e.HistoricalNames)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<(IReadOnlyList<TradeEntity> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        EntityType? entityType,
        string? country,
        string? productCategory,
        SeverityLevel? severityFilter,
        int page,
        int pageSize,
        string? sortBy = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.TradeEntities
            .Include(e => e.PhoneNumbers)
            .Include(e => e.WeChatIds)
            .AsQueryable();

        // Search by name, phone, or WeChat ID (BRD: scam prevention search)
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.ToLower();
            query = query.Where(e =>
                e.LegalName.ToLower().Contains(term) ||
                (e.TradeName != null && e.TradeName.ToLower().Contains(term)) ||
                e.PhoneNumbers.Any(p => p.PhoneNumber.Contains(term)) ||
                e.WeChatIds.Any(w => w.WeChatId.ToLower().Contains(term)) ||
                e.HistoricalNames.Any(h => h.PreviousName.ToLower().Contains(term)));
        }

        // Filters
        if (entityType.HasValue)
            query = query.Where(e => e.EntityType == entityType.Value);

        if (!string.IsNullOrWhiteSpace(country))
            query = query.Where(e => e.Country.ToLower() == country.ToLower());

        if (!string.IsNullOrWhiteSpace(productCategory))
            query = query.Where(e => e.ProductCategories != null &&
                e.ProductCategories.ToLower().Contains(productCategory.ToLower()));

        if (severityFilter.HasValue)
        {
            query = severityFilter.Value switch
            {
                SeverityLevel.Critical => query.Where(e => e.CriticalReviewCount > 0),
                SeverityLevel.Warning => query.Where(e => e.WarningReviewCount > 0),
                SeverityLevel.Info => query.Where(e => e.InfoReviewCount > 0),
                _ => query
            };
        }

        var totalCount = await query.CountAsync(cancellationToken);

        // Sorting
        query = sortBy?.ToLower() switch
        {
            "recent" => query.OrderByDescending(e => e.LastReviewDate ?? e.ListedDate),
            "reviews" => query.OrderByDescending(e => e.TotalReviewCount),
            "name" => query.OrderBy(e => e.LegalName),
            _ => query.OrderByDescending(e => e.CreatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<TradeEntity> AddAsync(TradeEntity entity, CancellationToken cancellationToken = default)
    {
        await _context.TradeEntities.AddAsync(entity, cancellationToken);
        return entity;
    }

    public Task UpdateAsync(TradeEntity entity, CancellationToken cancellationToken = default)
    {
        _context.TradeEntities.Update(entity);
        return Task.CompletedTask;
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.TradeEntities.AnyAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<TradeEntity>> FindByContactInfoAsync(
        string? phoneNumber, string? weChatId, CancellationToken cancellationToken = default)
    {
        var query = _context.TradeEntities
            .Include(e => e.PhoneNumbers)
            .Include(e => e.WeChatIds)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(phoneNumber))
        {
            query = query.Where(e => e.PhoneNumbers.Any(p => p.PhoneNumber == phoneNumber));
        }

        if (!string.IsNullOrWhiteSpace(weChatId))
        {
            query = query.Where(e => e.WeChatIds.Any(w => w.WeChatId == weChatId));
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<TradeEntity?> FindByNameAsync(string legalName, CancellationToken cancellationToken = default)
    {
        return await _context.TradeEntities
            .FirstOrDefaultAsync(e => e.LegalName.ToLower() == legalName.ToLower(), cancellationToken);
    }
}
