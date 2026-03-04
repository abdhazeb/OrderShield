using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.WatchRequests.DTOs;

namespace OrderShieldPro.Application.WatchRequests.Queries;

public class GetWatchRequestsByUserQueryHandler : IRequestHandler<GetWatchRequestsByUserQuery, PaginatedList<WatchRequestDto>>
{
    private readonly IApplicationDbContext _context;

    public GetWatchRequestsByUserQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<WatchRequestDto>> Handle(GetWatchRequestsByUserQuery request, CancellationToken cancellationToken)
    {
        var query = _context.WatchRequests
            .Where(w => w.RequestedById == request.UserId)
            .OrderByDescending(w => w.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(w => new WatchRequestDto
            {
                Id = w.Id,
                RequestedById = w.RequestedById,
                EntityName = w.EntityName,
                EntityPhone = w.EntityPhone,
                EntityWeChat = w.EntityWeChat,
                EntityCountry = w.EntityCountry,
                AdditionalDetails = w.AdditionalDetails,
                Status = w.Status,
                ResultEntityId = w.ResultEntityId,
                ResolvedDate = w.ResolvedDate,
                CreatedAt = w.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return PaginatedList<WatchRequestDto>.Create(items, totalCount, request.Page, request.PageSize);
    }
}
