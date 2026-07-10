using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Commands;

public class RejectReviewEditCommandHandler : IRequestHandler<RejectReviewEditCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public RejectReviewEditCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(RejectReviewEditCommand request, CancellationToken cancellationToken)
    {
        var review = await _unitOfWork.Reviews.GetByIdAsync(request.ReviewId, cancellationToken);
        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        if (review.Status != ReviewStatus.PendingEdit)
            return Result.Failure("This review does not have a pending edit to reject.");

        // Discard the pending edit snapshot and restore the review to Published.
        // The original content fields (Title, Narrative, etc.) have never been
        // touched — they were preserved when the edit was submitted.
        review.PendingEditJson = null;
        review.Status = ReviewStatus.Published;
        review.UpdatedBy = _currentUserService.UserId;

        await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
