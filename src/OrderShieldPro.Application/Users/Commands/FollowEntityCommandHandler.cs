using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Users.Commands;

public class FollowEntityCommandHandler : IRequestHandler<FollowEntityCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITradeEntityRepository _entityRepo;

    public FollowEntityCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ITradeEntityRepository entityRepo)
    {
        _context = context;
        _currentUserService = currentUserService;
        _entityRepo = entityRepo;
    }

    public async Task<Result> Handle(FollowEntityCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result.Failure("User not authenticated.");

        var entityExists = await _entityRepo.ExistsAsync(request.TradeEntityId, cancellationToken);
        if (!entityExists)
            throw new NotFoundException(nameof(TradeEntity), request.TradeEntityId);

        var alreadyFollowing = await _context.UserFollowedEntities
            .AnyAsync(f => f.UserId == _currentUserService.UserId && f.TradeEntityId == request.TradeEntityId, cancellationToken);

        if (alreadyFollowing)
            return Result.Failure("You are already following this entity.");

        _context.UserFollowedEntities.Add(new UserFollowedEntity
        {
            UserId = _currentUserService.UserId,
            TradeEntityId = request.TradeEntityId
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
