using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Commands;

public class CreateSubscriptionRequestCommandHandler
    : IRequestHandler<CreateSubscriptionRequestCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateSubscriptionRequestCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(CreateSubscriptionRequestCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<Guid>.Failure("User not authenticated.");

        if (request.DurationYears < 1 || request.DurationYears > 3)
            return Result<Guid>.Failure("Duration must be 1, 2, or 3 years.");

        if (request.RequestedTier == SubscriptionTier.Free)
            return Result<Guid>.Failure("Cannot request a Free tier subscription.");

        // Check for existing pending request
        var hasPending = await _context.SubscriptionRequests
            .AnyAsync(r => r.UserId == _currentUserService.UserId
                        && r.Status == SubscriptionRequestStatus.Pending,
                cancellationToken);

        if (hasPending)
            return Result<Guid>.Failure("You already have a pending subscription request. Please wait for it to be reviewed.");

        // Calculate pricing from system settings
        var settings = await _context.SystemSettings.ToListAsync(cancellationToken);
        var annualPrice = decimal.Parse(
            settings.FirstOrDefault(s => s.Key == "annual_subscription_price")?.Value ?? "99");
        var twoYearDiscount = decimal.Parse(
            settings.FirstOrDefault(s => s.Key == "two_year_discount_percent")?.Value ?? "15");
        var threeYearDiscount = decimal.Parse(
            settings.FirstOrDefault(s => s.Key == "three_year_discount_percent")?.Value ?? "25");

        var basePrice = annualPrice;

        var discountPercent = request.DurationYears switch
        {
            2 => twoYearDiscount,
            3 => threeYearDiscount,
            _ => 0m
        };

        var totalBeforeDiscount = basePrice * request.DurationYears;
        var totalAmount = totalBeforeDiscount * (1 - discountPercent / 100);

        var subscriptionRequest = new SubscriptionRequest
        {
            UserId = _currentUserService.UserId,
            RequestedTier = request.RequestedTier,
            DurationYears = request.DurationYears,
            TotalAmount = Math.Round(totalAmount, 2),
            PaymentProofFileName = request.PaymentProofFileName,
            PaymentProofStoragePath = request.PaymentProofStoragePath,
            PaymentNotes = request.PaymentNotes,
            Status = SubscriptionRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.SubscriptionRequests.Add(subscriptionRequest);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(subscriptionRequest.Id);
    }
}
