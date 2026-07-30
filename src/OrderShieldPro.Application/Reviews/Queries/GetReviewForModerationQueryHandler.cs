using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.Queries;

public class GetReviewForModerationQueryHandler
    : IRequestHandler<GetReviewForModerationQuery, Result<ReviewModerationDto>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IIdentityService _identityService;

    public GetReviewForModerationQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IIdentityService identityService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _identityService = identityService;
    }

    public async Task<Result<ReviewModerationDto>> Handle(
        GetReviewForModerationQuery request, CancellationToken cancellationToken)
    {
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);
        if (!isModerator)
            throw new ForbiddenAccessException();

        var review = await _context.Reviews
            .AsNoTracking()
            .Include(r => r.TradeEntity)
            .Include(r => r.EvidenceFiles)
            .Include(r => r.EvidenceNotes)
            .FirstOrDefaultAsync(r => r.Id == request.ReviewId, cancellationToken);

        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        // One lookup covers the reviewer and every note author.
        var userIds = review.EvidenceNotes
            .Select(n => n.AuthoredById)
            .Append(review.ReviewerId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToList();
        var userInfo = await _identityService.GetUserInfoAsync(userIds, cancellationToken);

        var reviewer = userInfo.GetValueOrDefault(review.ReviewerId);

        return Result<ReviewModerationDto>.Success(new ReviewModerationDto
        {
            Id = review.Id,
            Status = review.Status,
            Severity = review.Severity,
            IsComment = review.Severity == SeverityLevel.Info,

            TradeEntityId = review.TradeEntityId,
            TradeEntityName = review.TradeEntity?.LegalName ?? string.Empty,
            TradeEntityCountry = review.TradeEntity?.Country,
            TradeEntityRegion = review.TradeEntity?.Region,
            TradeEntityVerificationStatus = review.TradeEntity?.VerificationStatus ?? VerificationStatus.Unverified,
            TradeEntityIsHidden = review.TradeEntity?.IsHidden ?? false,
            TradeEntityTotalReviewCount = review.TradeEntity?.TotalReviewCount ?? 0,

            ReviewerId = review.ReviewerId,
            ReviewerName = reviewer.Name,
            ReviewerEmail = reviewer.Email,
            ReviewerType = review.ReviewerType,
            TransactionRole = review.TransactionRole,
            VerificationEmail = review.VerificationEmail,

            Title = review.Title,
            Narrative = review.Narrative,
            Product = review.Product,
            ProductCategory = review.ProductCategory,
            IncidentDate = review.IncidentDate,
            OrderValue = review.OrderValue,

            ContactName = review.ContactName,
            ContactPosition = review.ContactPosition,
            ContactPhoneUsed = review.ContactPhoneUsed,
            ContactWeChatUsed = review.ContactWeChatUsed,

            EvidenceLinks = review.EvidenceLinks,
            EvidenceFiles = review.EvidenceFiles
                .OrderBy(f => f.CreatedAt)
                .Select(f => new EvidenceFileDto
                {
                    Id = f.Id,
                    FileName = f.FileName,
                    ContentType = f.ContentType,
                    FileSizeBytes = f.FileSizeBytes
                }).ToList(),
            EvidenceNotes = review.EvidenceNotes
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new ModerationNoteDto
                {
                    Id = n.Id,
                    Summary = n.Summary,
                    VerificationOutcome = n.VerificationOutcome,
                    IsPubliclyVisible = n.IsPubliclyVisible,
                    AuthoredByName = userInfo.GetValueOrDefault(n.AuthoredById).Name,
                    CreatedAt = n.CreatedAt
                }).ToList(),

            PendingEditJson = review.PendingEditJson,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        });
    }
}
