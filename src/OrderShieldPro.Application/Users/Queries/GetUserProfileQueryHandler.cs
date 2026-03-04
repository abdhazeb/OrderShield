using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;

namespace OrderShieldPro.Application.Users.Queries;

public class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, Result<UserProfileDto>>
{
    private readonly IIdentityService _identityService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApplicationDbContext _context;

    public GetUserProfileQueryHandler(
        IIdentityService identityService,
        ICurrentUserService currentUserService,
        IApplicationDbContext context)
    {
        _identityService = identityService;
        _currentUserService = currentUserService;
        _context = context;
    }

    public async Task<Result<UserProfileDto>> Handle(GetUserProfileQuery request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<UserProfileDto>.Failure("User not authenticated.");

        var profile = await _identityService.GetUserProfileAsync(_currentUserService.UserId, cancellationToken);

        if (profile is null)
            throw new NotFoundException("User", _currentUserService.UserId);

        // Enrich with counts from our context
        var reviewCount = await _context.Reviews
            .CountAsync(r => r.ReviewerId == _currentUserService.UserId, cancellationToken);

        var watchlistCount = await _context.UserFollowedEntities
            .CountAsync(f => f.UserId == _currentUserService.UserId, cancellationToken);

        return Result<UserProfileDto>.Success(profile with
        {
            ReviewCount = reviewCount,
            WatchlistCount = watchlistCount
        });
    }
}
