using System.Text.Json;
using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Commands;

public class ApproveReviewEditCommandHandler : IRequestHandler<ApproveReviewEditCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public ApproveReviewEditCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(ApproveReviewEditCommand request, CancellationToken cancellationToken)
    {
        var review = await _unitOfWork.Reviews.GetByIdAsync(request.ReviewId, cancellationToken);
        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        if (review.Status != ReviewStatus.PendingEdit)
            return Result.Failure("This review does not have a pending edit to approve.");

        if (string.IsNullOrWhiteSpace(review.PendingEditJson))
            return Result.Failure("Pending edit data is missing.");

        var edit = JsonSerializer.Deserialize<ReviewPendingEdit>(review.PendingEditJson);
        if (edit is null)
            return Result.Failure("Failed to deserialise pending edit data.");

        var oldSeverity = review.Severity;

        // Apply the pending edit
        review.Severity = edit.Severity;
        review.Title = edit.Title;
        review.Narrative = edit.Narrative;
        review.Product = edit.Product;
        review.ProductCategory = edit.ProductCategory;
        review.IncidentDate = edit.IncidentDate;
        review.ContactName = edit.ContactName;
        review.ContactPhoneUsed = edit.ContactPhoneUsed;
        review.PendingEditJson = null;
        review.Status = ReviewStatus.Published;
        review.UpdatedBy = _currentUserService.UserId;

        // Update entity-level severity counts if severity changed
        if (oldSeverity != review.Severity)
        {
            var entity = await _unitOfWork.TradeEntities.GetByIdAsync(review.TradeEntityId, cancellationToken);
            if (entity is not null)
            {
                DecrementCount(entity, oldSeverity);
                IncrementCount(entity, review.Severity);
                await _unitOfWork.TradeEntities.UpdateAsync(entity, cancellationToken);
            }
        }

        await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static void DecrementCount(Domain.Entities.TradeEntity entity, SeverityLevel severity)
    {
        switch (severity)
        {
            case SeverityLevel.Info: entity.InfoReviewCount = Math.Max(0, entity.InfoReviewCount - 1); break;
            case SeverityLevel.Warning: entity.WarningReviewCount = Math.Max(0, entity.WarningReviewCount - 1); break;
            case SeverityLevel.Critical: entity.CriticalReviewCount = Math.Max(0, entity.CriticalReviewCount - 1); break;
        }
    }

    private static void IncrementCount(Domain.Entities.TradeEntity entity, SeverityLevel severity)
    {
        switch (severity)
        {
            case SeverityLevel.Info: entity.InfoReviewCount++; break;
            case SeverityLevel.Warning: entity.WarningReviewCount++; break;
            case SeverityLevel.Critical: entity.CriticalReviewCount++; break;
        }
    }
}
