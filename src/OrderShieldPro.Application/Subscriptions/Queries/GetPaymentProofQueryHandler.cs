using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

public class GetPaymentProofQueryHandler
    : IRequestHandler<GetPaymentProofQuery, Result<PaymentProofDto>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetPaymentProofQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PaymentProofDto>> Handle(
        GetPaymentProofQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (userId is null)
            return Result<PaymentProofDto>.Failure("User not authenticated.");

        var subscriptionRequest = await _context.SubscriptionRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken);

        if (subscriptionRequest is null)
            return Result<PaymentProofDto>.Failure("Payment proof not found.");

        // Only the user who submitted the request, or a moderator reviewing it, may
        // read the proof — these files contain bank and transaction details.
        var isOwner = subscriptionRequest.UserId == userId;
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);
        if (!isOwner && !isModerator)
            return Result<PaymentProofDto>.Failure("Payment proof not found.");

        if (string.IsNullOrWhiteSpace(subscriptionRequest.PaymentProofStoragePath))
            return Result<PaymentProofDto>.Failure("Payment proof not found.");

        return Result<PaymentProofDto>.Success(new PaymentProofDto
        {
            StoragePath = subscriptionRequest.PaymentProofStoragePath,
            FileName = subscriptionRequest.PaymentProofFileName ?? subscriptionRequest.PaymentProofStoragePath
        });
    }
}
