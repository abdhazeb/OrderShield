using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Queries;

public class GetPendingSubscriptionRequestsQueryHandler
    : IRequestHandler<GetPendingSubscriptionRequestsQuery, Result<List<SubscriptionRequestDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IIdentityService _identityService;

    public GetPendingSubscriptionRequestsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IIdentityService identityService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _identityService = identityService;
    }

    public async Task<Result<List<SubscriptionRequestDto>>> Handle(
        GetPendingSubscriptionRequestsQuery request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<List<SubscriptionRequestDto>>.Failure("User not authenticated.");

        if (_currentUserService.Role != "Admin" && _currentUserService.Role != "SuperAdmin")
            return Result<List<SubscriptionRequestDto>>.Failure("Only admins can view pending requests.");

        var requests = await _context.SubscriptionRequests
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new SubscriptionRequestDto
            {
                Id = r.Id,
                UserId = r.UserId,
                RequestedTier = r.RequestedTier,
                DurationYears = r.DurationYears,
                TotalAmount = r.TotalAmount,
                PaymentProofFileName = r.PaymentProofFileName,
                PaymentProofStoragePath = r.PaymentProofStoragePath,
                PaymentNotes = r.PaymentNotes,
                Status = r.Status,
                AdminNotes = r.AdminNotes,
                ReviewedById = r.ReviewedById,
                ReviewedAt = r.ReviewedAt,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // Enrich with user display names and emails
        var userIds = requests.Select(r => r.UserId).Distinct().ToList();
        var reviewerIds = requests.Where(r => r.ReviewedById != null).Select(r => r.ReviewedById!).Distinct().ToList();
        var allIds = userIds.Concat(reviewerIds).Distinct();
        var userInfo = await _identityService.GetUserInfoAsync(allIds, cancellationToken);

        var enriched = requests.Select(r => r with
        {
            UserName = userInfo.TryGetValue(r.UserId, out var ui) ? ui.Name : "Unknown",
            UserEmail = userInfo.TryGetValue(r.UserId, out var ue) ? ue.Email : "",
            ReviewedByName = r.ReviewedById != null
                ? (userInfo.TryGetValue(r.ReviewedById, out var ri) ? ri.Name : "Unknown")
                : null
        }).ToList();

        return Result<List<SubscriptionRequestDto>>.Success(enriched);
    }
}
