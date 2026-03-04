using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Users.Commands;

public class UnfollowEntityCommandHandler : IRequestHandler<UnfollowEntityCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UnfollowEntityCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(UnfollowEntityCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result.Failure("User not authenticated.");

        var follow = await _context.UserFollowedEntities
            .FirstOrDefaultAsync(f => f.UserId == _currentUserService.UserId && f.TradeEntityId == request.TradeEntityId, cancellationToken);

        if (follow is null)
            return Result.Failure("You are not following this entity.");

        _context.UserFollowedEntities.Remove(follow);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
