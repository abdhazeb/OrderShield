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

    private static readonly string[] ModeratorRoles = { "Admin", "SuperAdmin", "ServiceTeam" };

    public async Task<Result> Handle(UpdateReviewCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated || _currentUserService.UserId is null)
            return Result.Failure("You must be authenticated to edit a review.");

        var review = await _unitOfWork.Reviews.GetByIdAsync(request.ReviewId, cancellationToken);
        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        var isOwner = string.Equals(review.ReviewerId, _currentUserService.UserId, StringComparison.Ordinal);
        var isModerator = _currentUserService.Role is not null && ModeratorRoles.Contains(_currentUserService.Role);

        if (!isOwner && !isModerator)
            return Result.Failure("You can only edit your own reviews.");

        if (isModerator)
        {
            // Moderator edits are applied directly — no re-moderation needed.
            ApplyEditToReview(review, request);
            review.UpdatedBy = _currentUserService.UserId;
            await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }

        // ── Owner edit path ────────────────────────────────────────────────────
        if (review.Status == ReviewStatus.Published)
        {
            // The review is currently live. Save the edit as a pending snapshot
            // so the original content stays published until an admin reviews it.
            var pendingEdit = new ReviewPendingEdit
            {
                Severity = request.IsComment ? SeverityLevel.Info : request.Severity,
                Title = request.Title,
                Narrative = request.Narrative,
                Product = request.Product,
                ProductCategory = request.ProductCategory,
                IncidentDate = request.IncidentDate,
                ContactName = request.ContactName,
                ContactPosition = request.ContactPosition,
                ContactPhoneUsed = request.ContactPhoneUsed,
                IsComment = request.IsComment,
            };
            review.PendingEditJson = JsonSerializer.Serialize(pendingEdit);
            review.Status = ReviewStatus.PendingEdit;
            review.UpdatedBy = _currentUserService.UserId;

            await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifySuperAdminsAsync(
                NotificationType.NewReviewPendingApproval,
                "Review edit awaiting approval",
                $"A published review \"{review.Title}\" has a pending edit that needs approval.",
                referenceEntityId: review.TradeEntityId,
                referenceReviewId: review.Id,
                templateKey: "reviewEditPendingApproval",
                subject: review.Title,
                cancellationToken: cancellationToken);

            return Result.Success();
        }

        // Review is not yet published (Pending / Rejected / PendingEdit) — apply in-place
        // and send back to Pending for re-moderation.
        if (review.Status == ReviewStatus.PendingEdit)
        {
            // Clear any previous pending-edit snapshot; just replace with the new one.
            review.PendingEditJson = null;
        }

        ApplyEditToReview(review, request);
        review.Status = ReviewStatus.Pending;
        review.UpdatedBy = _currentUserService.UserId;

        await _unitOfWork.Reviews.UpdateAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _notificationService.NotifySuperAdminsAsync(
            NotificationType.NewReviewPendingApproval,
            "Edited review awaiting approval",
            $"A review \"{review.Title}\" was edited and needs re-moderation.",
            referenceEntityId: review.TradeEntityId,
            referenceReviewId: review.Id,
            templateKey: "editedReviewNeedsReModeration",
            subject: review.Title,
            cancellationToken: cancellationToken);

        return Result.Success();
    }

    private static void ApplyEditToReview(Review review, UpdateReviewCommand request)
    {
        review.Severity = request.IsComment ? SeverityLevel.Info : request.Severity;
        review.Title = request.Title;
        review.Narrative = request.Narrative;
        review.Product = request.Product;
        review.ProductCategory = request.ProductCategory;
        review.IncidentDate = request.IncidentDate;
        review.ContactName = request.ContactName;
        review.ContactPosition = request.ContactPosition;
        review.ContactPhoneUsed = request.ContactPhoneUsed;
        review.PendingEditJson = null; // clear any stale snapshot
    }
}
