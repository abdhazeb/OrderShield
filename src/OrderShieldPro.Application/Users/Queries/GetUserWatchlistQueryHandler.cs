using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;

namespace OrderShieldPro.Application.Users.Queries;

public class GetUserWatchlistQueryHandler : IRequestHandler<GetUserWatchlistQuery, PaginatedList<WatchlistItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetUserWatchlistQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PaginatedList<WatchlistItemDto>> Handle(GetUserWatchlistQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? string.Empty;

        var query = _context.UserFollowedEntities
            .Where(f => f.UserId == userId)
            .Include(f => f.TradeEntity)
            .OrderByDescending(f => f.FollowedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(f => new WatchlistItemDto
            {
                TradeEntityId = f.TradeEntityId,
                LegalName = f.TradeEntity.LegalName,
                TradeName = f.TradeEntity.TradeName,
                Country = f.TradeEntity.Country,
                TotalReviewCount = f.TradeEntity.TotalReviewCount,
                CriticalReviewCount = f.TradeEntity.CriticalReviewCount,
                FollowedAt = f.FollowedAt
            })
            .ToListAsync(cancellationToken);

        return PaginatedList<WatchlistItemDto>.Create(items, totalCount, request.Page, request.PageSize);
    }
}
