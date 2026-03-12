using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

public class GetMySubscriptionRequestsQueryHandler
    : IRequestHandler<GetMySubscriptionRequestsQuery, Result<List<SubscriptionRequestDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMySubscriptionRequestsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<List<SubscriptionRequestDto>>> Handle(
        GetMySubscriptionRequestsQuery request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<List<SubscriptionRequestDto>>.Failure("User not authenticated.");

        var requests = await _context.SubscriptionRequests
            .Where(r => r.UserId == _currentUserService.UserId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new SubscriptionRequestDto
            {
                Id = r.Id,
                UserId = r.UserId,
                RequestedTier = r.RequestedTier,
                DurationYears = r.DurationYears,
                TotalAmount = r.TotalAmount,
                PaymentProofFileName = r.PaymentProofFileName,
                PaymentNotes = r.PaymentNotes,
                Status = r.Status,
                AdminNotes = r.AdminNotes,
                ReviewedAt = r.ReviewedAt,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Result<List<SubscriptionRequestDto>>.Success(requests);
    }
}
