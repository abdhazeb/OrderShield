using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Queries;

public class SearchEntitiesQueryHandler : IRequestHandler<SearchEntitiesQuery, PaginatedList<EntitySearchResultDto>>
{
    private readonly ITradeEntityRepository _repository;

    public SearchEntitiesQueryHandler(ITradeEntityRepository repository)
    {
        _repository = repository;
    }

    public async Task<PaginatedList<EntitySearchResultDto>> Handle(SearchEntitiesQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _repository.SearchAsync(
            request.SearchTerm,
            request.EntityType,
            request.Country,
            request.ProductCategory,
            request.SeverityFilter,
            request.Page,
            request.PageSize,
            request.SortBy,
            cancellationToken);

        var dtos = items.Select(e => new EntitySearchResultDto
        {
            Id = e.Id,
            LegalName = e.LegalName,
            TradeName = e.TradeName,
            EntityType = e.EntityType,
            Country = e.Country,
            Region = e.Region,
            ProductCategories = e.ProductCategories,
            VerificationStatus = e.VerificationStatus,
            TotalReviewCount = e.TotalReviewCount,
            InfoReviewCount = e.InfoReviewCount,
            WarningReviewCount = e.WarningReviewCount,
            CriticalReviewCount = e.CriticalReviewCount,
            LastReviewDate = e.LastReviewDate,
            ListedDate = e.ListedDate
        }).ToList();

        return PaginatedList<EntitySearchResultDto>.Create(dtos, totalCount, request.Page, request.PageSize);
    }
}
