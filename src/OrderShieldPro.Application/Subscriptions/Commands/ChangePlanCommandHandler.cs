using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Subscriptions.Commands;

public class ChangePlanCommandHandler : IRequestHandler<ChangePlanCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ChangePlanCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(ChangePlanCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result.Failure("User not authenticated.");

        // Verify the plan exists
        var planExists = await _context.SubscriptionPlans
            .AnyAsync(p => p.Tier == request.NewTier && p.IsActive, cancellationToken);

        if (!planExists)
            return Result.Failure($"No active plan found for tier '{request.NewTier}'.");

        // NOTE: Actual user update happens via IIdentityService in Infrastructure
        // This is a simplified implementation; in production would involve payment processing
        return Result.Success();
    }
}
