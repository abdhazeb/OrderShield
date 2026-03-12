using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Commands;

public class ApproveSubscriptionRequestCommandHandler
    : IRequestHandler<ApproveSubscriptionRequestCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IIdentityService _identityService;

    public ApproveSubscriptionRequestCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IIdentityService identityService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _identityService = identityService;
    }

    public async Task<Result> Handle(ApproveSubscriptionRequestCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result.Failure("User not authenticated.");

        if (_currentUserService.Role != "Admin" && _currentUserService.Role != "SuperAdmin")
            return Result.Failure("Only admins can approve subscription requests.");

        var subscriptionRequest = await _context.SubscriptionRequests
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken);

        if (subscriptionRequest is null)
            return Result.Failure("Subscription request not found.");

        if (subscriptionRequest.Status != SubscriptionRequestStatus.Pending)
            return Result.Failure("This request has already been processed.");

        // Approve the request
        subscriptionRequest.Status = SubscriptionRequestStatus.Approved;
        subscriptionRequest.AdminNotes = request.AdminNotes;
        subscriptionRequest.ReviewedById = _currentUserService.UserId;
        subscriptionRequest.ReviewedAt = DateTime.UtcNow;
        subscriptionRequest.UpdatedAt = DateTime.UtcNow;

        // Update the user's subscription
        var newExpiryDate = DateTime.UtcNow.AddYears(subscriptionRequest.DurationYears);
        var updateResult = await _identityService.UpdateSubscriptionAsync(
            subscriptionRequest.UserId,
            subscriptionRequest.RequestedTier,
            newExpiryDate,
            cancellationToken);

        if (!updateResult.Succeeded)
            return Result.Failure(updateResult.Errors);

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
