using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Queries;

public class GetHiddenReviewsQueryHandler : IRequestHandler<GetHiddenReviewsQuery, PaginatedList<ReviewDto>>
{
    private readonly IReviewRepository _repository;
    private readonly IIdentityService _identityService;

    public GetHiddenReviewsQueryHandler(IReviewRepository repository, IIdentityService identityService)
    {
        _repository = repository;
        _identityService = identityService;
    }

    public async Task<PaginatedList<ReviewDto>> Handle(GetHiddenReviewsQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _repository.GetHiddenAsync(
            request.Page, request.PageSize, cancellationToken);

        var reviewerIds = items.Select(r => r.ReviewerId);
        var updaterIds = items.Select(r => r.UpdatedBy).Where(id => id is not null).Cast<string>();
        var nameMap = await _identityService.GetUserDisplayNamesAsync(
            reviewerIds.Concat(updaterIds).Distinct(), cancellationToken);

        var dtos = items.Select(r => new ReviewDto
        {
            Id = r.Id,
            TradeEntityId = r.TradeEntityId,
            TradeEntityName = r.TradeEntity?.LegalName ?? string.Empty,
            ReviewerId = r.ReviewerId,
            ReviewerName = nameMap.GetValueOrDefault(r.ReviewerId),
            ReviewerType = r.ReviewerType,
            Severity = r.Severity,
            Status = r.Status,
            Title = r.Title,
            Narrative = r.Narrative,
            Product = r.Product,
            ProductCategory = r.ProductCategory,
            IncidentDate = r.IncidentDate,
            OrderValue = r.OrderValue,
            EvidenceLinks = r.EvidenceLinks,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            UpdatedByName = r.UpdatedBy is not null ? nameMap.GetValueOrDefault(r.UpdatedBy) : null
        }).ToList();

        return PaginatedList<ReviewDto>.Create(dtos, totalCount, request.Page, request.PageSize);
    }
}
