using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

public class GetCurrentPlanQueryHandler : IRequestHandler<GetCurrentPlanQuery, Result<CurrentSubscriptionDto>>
{
    private readonly IIdentityService _identityService;
    private readonly ICurrentUserService _currentUserService;

    public GetCurrentPlanQueryHandler(IIdentityService identityService, ICurrentUserService currentUserService)
    {
        _identityService = identityService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CurrentSubscriptionDto>> Handle(GetCurrentPlanQuery request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<CurrentSubscriptionDto>.Failure("User not authenticated.");

        var profile = await _identityService.GetUserProfileAsync(_currentUserService.UserId, cancellationToken);

        if (profile is null)
            return Result<CurrentSubscriptionDto>.Failure("User not found.");

        return Result<CurrentSubscriptionDto>.Success(new CurrentSubscriptionDto
        {
            Tier = profile.SubscriptionTier,
            PlanName = profile.SubscriptionTier.ToString(),
            ExpiryDate = profile.SubscriptionExpiryDate
        });
    }
}
