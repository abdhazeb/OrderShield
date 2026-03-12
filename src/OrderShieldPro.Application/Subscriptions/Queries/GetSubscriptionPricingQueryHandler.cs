using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Queries;

public class GetSubscriptionPricingQueryHandler
    : IRequestHandler<GetSubscriptionPricingQuery, Result<List<SubscriptionPricingDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetSubscriptionPricingQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<SubscriptionPricingDto>>> Handle(
        GetSubscriptionPricingQuery request, CancellationToken cancellationToken)
    {
        var settings = await _context.SystemSettings.ToListAsync(cancellationToken);
        var annualPrice = decimal.Parse(
            settings.FirstOrDefault(s => s.Key == "annual_subscription_price")?.Value ?? "99");
        var twoYearDiscount = decimal.Parse(
            settings.FirstOrDefault(s => s.Key == "two_year_discount_percent")?.Value ?? "15");
        var threeYearDiscount = decimal.Parse(
            settings.FirstOrDefault(s => s.Key == "three_year_discount_percent")?.Value ?? "25");

        var result = new List<SubscriptionPricingDto>
        {
            new()
            {
                Tier = SubscriptionTier.Pro,
                PlanName = "Pro",
                AnnualPrice = annualPrice,
                Options = new List<DurationOption>
                {
                    new()
                    {
                        Years = 1,
                        TotalPrice = Math.Round(annualPrice, 2),
                        DiscountPercent = 0,
                        SavedAmount = 0
                    },
                    new()
                    {
                        Years = 2,
                        TotalPrice = Math.Round(annualPrice * 2 * (1 - twoYearDiscount / 100), 2),
                        DiscountPercent = twoYearDiscount,
                        SavedAmount = Math.Round(annualPrice * 2 * twoYearDiscount / 100, 2)
                    },
                    new()
                    {
                        Years = 3,
                        TotalPrice = Math.Round(annualPrice * 3 * (1 - threeYearDiscount / 100), 2),
                        DiscountPercent = threeYearDiscount,
                        SavedAmount = Math.Round(annualPrice * 3 * threeYearDiscount / 100, 2)
                    }
                }
            }
        };

        return Result<List<SubscriptionPricingDto>>.Success(result);
    }
}
