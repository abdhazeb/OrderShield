using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Queries;

public class GetPendingReviewsQueryHandler : IRequestHandler<GetPendingReviewsQuery, PaginatedList<ReviewDto>>
{
    private readonly IReviewRepository _repository;
    private readonly IIdentityService _identityService;

    public GetPendingReviewsQueryHandler(IReviewRepository repository, IIdentityService identityService)
    {
        _repository = repository;
        _identityService = identityService;
    }

    public async Task<PaginatedList<ReviewDto>> Handle(GetPendingReviewsQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _repository.GetPendingAsync(
            request.Page, request.PageSize, cancellationToken);

        // Batch-fetch reviewer display names
        var reviewerIds = items.Select(r => r.ReviewerId).Distinct();
        var nameMap = await _identityService.GetUserDisplayNamesAsync(reviewerIds, cancellationToken);

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
            PendingEditJson = r.PendingEditJson,
            EvidenceFiles = r.EvidenceFiles.Select(f => new EvidenceFileDto
            {
                Id = f.Id,
                FileName = f.FileName,
                ContentType = f.ContentType,
                FileSizeBytes = f.FileSizeBytes
            }).ToList(),
            PublicEvidenceNotes = r.EvidenceNotes
                .Where(n => n.IsPubliclyVisible)
                .Select(n => new EvidenceNoteDto
                {
                    Id = n.Id,
                    Summary = n.Summary,
                    VerificationOutcome = n.VerificationOutcome,
                    CreatedAt = n.CreatedAt
                }).ToList(),
            CreatedAt = r.CreatedAt
        }).ToList();

        return PaginatedList<ReviewDto>.Create(dtos, totalCount, request.Page, request.PageSize);
    }
}
