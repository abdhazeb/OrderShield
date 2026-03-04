using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

/// <summary>
/// Get all available subscription plans.
/// </summary>
public record GetPlansQuery : IRequest<IReadOnlyList<SubscriptionPlanDto>>;

public class GetPlansQueryHandler : IRequestHandler<GetPlansQuery, IReadOnlyList<SubscriptionPlanDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPlansQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<SubscriptionPlanDto>> Handle(GetPlansQuery request, CancellationToken cancellationToken)
    {
        return await _context.SubscriptionPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder)
            .Select(p => new SubscriptionPlanDto
            {
                Id = p.Id,
                Name = p.Name,
                Tier = p.Tier,
                MonthlyPrice = p.MonthlyPrice,
                Description = p.Description,
                MaxReviewsPerMonth = p.MaxReviewsPerMonth,
                MaxWatchlistSize = p.MaxWatchlistSize,
                HasPriorityVerification = p.HasPriorityVerification,
                HasAdvancedFilters = p.HasAdvancedFilters,
                HasApiAccess = p.HasApiAccess,
                HasDedicatedSupport = p.HasDedicatedSupport,
                FeaturesJson = p.FeaturesJson,
                SortOrder = p.SortOrder
            })
            .ToListAsync(cancellationToken);
    }
}
