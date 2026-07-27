using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Commands;

public class UpdateReviewStatusCommandHandler : IRequestHandler<UpdateReviewStatusCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApplicationDbContext _context;

    public UpdateReviewStatusCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IApplicationDbContext context)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _context = context;
    }

    public async Task<Result> Handle(UpdateReviewStatusCommand request, CancellationToken cancellationToken)
    {
        var review = await _unitOfWork.Reviews.GetByIdAsync(request.ReviewId, cancellationToken);

        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        var oldStatus = review.Status;
        review.Status = request.NewStatus;
        review.UpdatedBy = _currentUserService.UserId;

        await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);

        // Update denormalized counts on entity when a review enters or leaves Published.
        // These two branches are independent (not if/else): a Published review can move
        // straight to Rejected (e.g. an admin hiding it), which must decrement the same
        // counters the original publish incremented — previously this transition was only
        // handled by the "else if" below, which never touched the counts, so a hidden
        // review's entity kept showing stale non-zero stats forever.
        if (request.NewStatus == ReviewStatus.Published && oldStatus != ReviewStatus.Published)
        {
            var entity = await _unitOfWork.TradeEntities.GetByIdAsync(review.TradeEntityId, cancellationToken);
            if (entity is not null)
            {
                entity.TotalReviewCount++;
                switch (review.Severity)
                {
                    case SeverityLevel.Info:
                        entity.InfoReviewCount++;
                        break;
                    case SeverityLevel.Warning:
                        entity.WarningReviewCount++;
                        break;
                    case SeverityLevel.Critical:
                        entity.CriticalReviewCount++;
                        break;
                }
                entity.LastReviewDate = DateTime.UtcNow;
                await _unitOfWork.TradeEntities.UpdateAsync(entity, cancellationToken);
            }

            // Create notification for the reviewer
            _context.Notifications.Add(new Notification
            {
                UserId = review.ReviewerId,
                Type = NotificationType.ReviewApproved,
                Title = "Review approved",
                Message = $"Your review \"{review.Title}\" has been approved and published.",
                TemplateKey = "reviewApproved",
                Subject = review.Title,
                ReferenceEntityId = review.TradeEntityId,
                ReferenceReviewId = review.Id
            });
        }
        else if (oldStatus == ReviewStatus.Published && request.NewStatus != ReviewStatus.Published)
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

        if (request.NewStatus == ReviewStatus.Rejected && oldStatus != ReviewStatus.Rejected)
        {
            // Notify the reviewer that their submission was rejected
            _context.Notifications.Add(new Notification
            {
                UserId = review.ReviewerId,
                Type = NotificationType.ReviewRejected,
                Title = "Review rejected",
                Message = $"Your review \"{review.Title}\" was not approved by the moderation team.",
                TemplateKey = "reviewRejected",
                Subject = review.Title,
                ReferenceEntityId = review.TradeEntityId,
                ReferenceReviewId = review.Id
            });
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
