using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace OrderShieldPro.Application.Entities.Queries;

public class GetEntityByIdQueryHandler : IRequestHandler<GetEntityByIdQuery, Result<EntityDetailDto>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly ITradeEntityRepository _repository;
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetEntityByIdQueryHandler(
        ITradeEntityRepository repository,
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<EntityDetailDto>> Handle(GetEntityByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _repository.GetByIdWithDetailsAsync(request.Id, cancellationToken);

        if (entity is null)
            throw new NotFoundException(nameof(Domain.Entities.TradeEntity), request.Id);

        // A hidden entity is invisible to the public but must stay reachable by moderators,
        // otherwise there would be no way to review or restore it.
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);
        if (entity.IsHidden && !isModerator)
            throw new NotFoundException(nameof(Domain.Entities.TradeEntity), request.Id);

        var followerCount = await _context.UserFollowedEntities
            .CountAsync(f => f.TradeEntityId == request.Id, cancellationToken);

        var isFollowed = false;
        if (_currentUserService.IsAuthenticated && _currentUserService.UserId is not null)
        {
            isFollowed = await _context.UserFollowedEntities
                .AnyAsync(f => f.TradeEntityId == request.Id && f.UserId == _currentUserService.UserId, cancellationToken);
        }

        var dto = new EntityDetailDto
        {
            Id = entity.Id,
            LegalName = entity.LegalName,
            TradeName = entity.TradeName,
            EntityType = entity.EntityType,
            Country = entity.Country,
            Region = entity.Region,
            City = entity.City,
            ProductCategories = entity.ProductCategories,
            VerificationStatus = entity.VerificationStatus,
            VerificationScore = entity.VerificationScore,
            ExternalRegistryLinks = entity.ExternalRegistryLinks,
            TotalReviewCount = entity.TotalReviewCount,
            InfoReviewCount = entity.InfoReviewCount,
            WarningReviewCount = entity.WarningReviewCount,
            CriticalReviewCount = entity.CriticalReviewCount,
            LastReviewDate = entity.LastReviewDate,
            ListedDate = entity.ListedDate,
            // Contact details are moderator-only. Emptying them here rather than hiding them
            // in the UI is the whole point: anything serialized into this response is public
            // to anyone who opens devtools or curls the endpoint.
            PhoneNumbers = isModerator ? entity.PhoneNumbers.Select(p => p.PhoneNumber).ToList() : Array.Empty<string>(),
            WeChatIds = isModerator ? entity.WeChatIds.Select(w => w.WeChatId).ToList() : Array.Empty<string>(),
            HistoricalNames = entity.HistoricalNames.Select(h => h.PreviousName).ToList(),
            FollowerCount = followerCount,
            IsFollowedByCurrentUser = isFollowed,
            IsHidden = entity.IsHidden
        };

        return Result<EntityDetailDto>.Success(dto);
    }
}
