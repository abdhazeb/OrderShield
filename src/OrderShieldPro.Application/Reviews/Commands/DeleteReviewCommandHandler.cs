using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Commands;

public class DeleteReviewCommandHandler : IRequestHandler<DeleteReviewCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public DeleteReviewCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(DeleteReviewCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated || _currentUserService.UserId is null)
            return Result.Failure("You must be authenticated to delete a review.");

        var review = await _unitOfWork.Reviews.GetByIdWithDetailsAsync(request.ReviewId, cancellationToken);
        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        // Only the original author may delete their review.
        if (!string.Equals(review.ReviewerId, _currentUserService.UserId, StringComparison.Ordinal))
            return Result.Failure("You can only delete your own reviews.");

        // If the review was published, remove it from the entity's public counts.
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

        await _unitOfWork.Reviews.RemoveAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
