using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Commands;

public class RejectSubscriptionRequestCommandHandler
    : IRequestHandler<RejectSubscriptionRequestCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public RejectSubscriptionRequestCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(RejectSubscriptionRequestCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result.Failure("User not authenticated.");

        if (_currentUserService.Role != "Admin" && _currentUserService.Role != "SuperAdmin")
            return Result.Failure("Only admins can reject subscription requests.");

        var subscriptionRequest = await _context.SubscriptionRequests
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken);

        if (subscriptionRequest is null)
            return Result.Failure("Subscription request not found.");

        if (subscriptionRequest.Status != SubscriptionRequestStatus.Pending)
            return Result.Failure("This request has already been processed.");

        subscriptionRequest.Status = SubscriptionRequestStatus.Rejected;
        subscriptionRequest.AdminNotes = request.AdminNotes;
        subscriptionRequest.ReviewedById = _currentUserService.UserId;
        subscriptionRequest.ReviewedAt = DateTime.UtcNow;
        subscriptionRequest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
