using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.Queries;

public class GetReviewForEditQueryHandler
    : IRequestHandler<GetReviewForEditQuery, Result<ReviewEditDto>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetReviewForEditQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ReviewEditDto>> Handle(
        GetReviewForEditQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (userId is null)
            return Result<ReviewEditDto>.Failure("You must be authenticated to edit a review.");

        var review = await _context.Reviews
            .AsNoTracking()
            .Include(r => r.TradeEntity)
            .FirstOrDefaultAsync(r => r.Id == request.ReviewId, cancellationToken);

        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        var isOwner = string.Equals(review.ReviewerId, userId, StringComparison.Ordinal);
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);
        if (!isOwner && !isModerator)
            throw new ForbiddenAccessException();

        // A review with an unapproved edit should open showing that edit, not the older
        // published text — otherwise re-saving would silently revert the owner's own changes.
        var pending = TryReadPendingEdit(review.PendingEditJson);

        return Result<ReviewEditDto>.Success(new ReviewEditDto
        {
            Id = review.Id,
            TradeEntityId = review.TradeEntityId,
            TradeEntityName = review.TradeEntity?.LegalName ?? string.Empty,
            Status = review.Status,
            Severity = pending?.Severity ?? review.Severity,
            IsComment = (pending?.Severity ?? review.Severity) == SeverityLevel.Info,
            Title = pending?.Title ?? review.Title,
            Narrative = pending?.Narrative ?? review.Narrative,
            Product = pending is null ? review.Product : pending.Product,
            ProductCategory = pending is null ? review.ProductCategory : pending.ProductCategory,
            IncidentDate = pending is null ? review.IncidentDate : pending.IncidentDate,
            ContactName = pending is null ? review.ContactName : pending.ContactName,
            ContactPosition = pending is null ? review.ContactPosition : pending.ContactPosition,
            ContactPhoneUsed = pending is null ? review.ContactPhoneUsed : pending.ContactPhoneUsed,
        });
    }

    private static ReviewPendingEdit? TryReadPendingEdit(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<ReviewPendingEdit>(json); } catch { return null; }
    }
}
