using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Commands;

public class UpdateReviewCommandHandler : IRequestHandler<UpdateReviewCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;

    public UpdateReviewCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        INotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
    }

    public async Task<Result> Handle(UpdateReviewCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated || _currentUserService.UserId is null)
            return Result.Failure("You must be authenticated to edit a review.");

        var review = await _unitOfWork.Reviews.GetByIdAsync(request.ReviewId, cancellationToken);
        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        // Only the original author may edit their review.
        if (!string.Equals(review.ReviewerId, _currentUserService.UserId, StringComparison.Ordinal))
            return Result.Failure("You can only edit your own reviews.");

        // If the review was already published, withdraw it from the public counts
        // because the edited version must be re-validated before it is shown again.
        if (review.Status == ReviewStatus.Published)
        {
            var entity = await _unitOfWork.TradeEntities.GetByIdAsync(review.TradeEntityId, cancellationToken);
            if (entity is not null)
            {
                entity.TotalReviewCount = Math.Max(0, entity.TotalReviewCount - 1);
                switch (review.Severity)
                {
                    case SeverityLevel.Info:
                        entity.InfoReviewCount = Math.Max(0, entity.InfoReviewCount - 1);
                        break;
                    case SeverityLevel.Warning:
                        entity.WarningReviewCount = Math.Max(0, entity.WarningReviewCount - 1);
                        break;
                    case SeverityLevel.Critical:
                        entity.CriticalReviewCount = Math.Max(0, entity.CriticalReviewCount - 1);
                        break;
                }
                await _unitOfWork.TradeEntities.UpdateAsync(entity, cancellationToken);
            }
        }

        review.Severity = request.Severity;
        review.Title = request.Title;
        review.Narrative = request.Narrative;
        review.Product = request.Product;
        review.ProductCategory = request.ProductCategory;
        review.IncidentDate = request.IncidentDate;
        review.ContactName = request.ContactName;
        review.ContactPhoneUsed = request.ContactPhoneUsed;
        review.Status = ReviewStatus.Pending; // Requires admin re-validation.
        review.UpdatedBy = _currentUserService.UserId;

        await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify SuperAdmins that an edited review needs re-moderation.
        await _notificationService.NotifySuperAdminsAsync(
            NotificationType.NewReviewPendingApproval,
            "Edited review awaiting approval",
            $"A review \"{review.Title}\" was edited and needs re-moderation.",
            referenceEntityId: review.TradeEntityId,
            referenceReviewId: review.Id,
            cancellationToken: cancellationToken);

        return Result.Success();
    }
}
