using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Queries;

public class GetHiddenEntitiesQueryHandler : IRequestHandler<GetHiddenEntitiesQuery, PaginatedList<HiddenEntityDto>>
{
    private readonly ITradeEntityRepository _repository;
    private readonly IIdentityService _identityService;

    public GetHiddenEntitiesQueryHandler(ITradeEntityRepository repository, IIdentityService identityService)
    {
        _repository = repository;
        _identityService = identityService;
    }

    public async Task<PaginatedList<HiddenEntityDto>> Handle(GetHiddenEntitiesQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _repository.GetHiddenAsync(
            request.Page, request.PageSize, cancellationToken);

        var updaterIds = items.Select(e => e.UpdatedBy).Where(id => id is not null).Cast<string>().Distinct();
        var nameMap = await _identityService.GetUserDisplayNamesAsync(updaterIds, cancellationToken);

        var dtos = items.Select(e => new HiddenEntityDto
        {
            Id = e.Id,
            LegalName = e.LegalName,
            TradeName = e.TradeName,
            EntityType = e.EntityType,
            Country = e.Country,
            TotalReviewCount = e.TotalReviewCount,
            HiddenAt = e.UpdatedAt,
            HiddenByName = e.UpdatedBy is not null ? nameMap.GetValueOrDefault(e.UpdatedBy) : null
        }).ToList();

        return PaginatedList<HiddenEntityDto>.Create(dtos, totalCount, request.Page, request.PageSize);
    }
}
