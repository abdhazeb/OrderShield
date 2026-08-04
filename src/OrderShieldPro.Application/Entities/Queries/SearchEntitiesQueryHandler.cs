using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Queries;

public class SearchEntitiesQueryHandler : IRequestHandler<SearchEntitiesQuery, PaginatedList<EntitySearchResultDto>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly ITradeEntityRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public SearchEntitiesQueryHandler(ITradeEntityRepository repository, ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
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
            request.IncludeHidden,
            cancellationToken);

        // Phone numbers are moderator-only. Withholding them here rather than in the UI is
        // the point — anything serialized into this response is public to anyone who opens
        // devtools, regardless of what the template chooses to render.
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);

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
            ListedDate = e.ListedDate,
            AlternativeNames = e.HistoricalNames.Select(h => h.PreviousName).Distinct().ToList(),
            PhoneNumbers = isModerator
                ? e.PhoneNumbers.Select(p => p.PhoneNumber).ToList()
                : Array.Empty<string>(),
            IsHidden = e.IsHidden
        }).ToList();

        return PaginatedList<EntitySearchResultDto>.Create(dtos, totalCount, request.Page, request.PageSize);
    }
}
