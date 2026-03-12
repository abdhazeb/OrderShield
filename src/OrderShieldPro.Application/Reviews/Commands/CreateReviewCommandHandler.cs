using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Reviews.Commands;

public class CreateReviewCommandHandler : IRequestHandler<CreateReviewCommand, Result<Guid>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public CreateReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(CreateReviewCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated || _currentUserService.UserId is null)
            return Result<Guid>.Failure("You must be authenticated to submit a review.");

        // Resolve entity: by ID if provided, else look up or create by name
        Guid entityId;
        if (request.TradeEntityId.HasValue && request.TradeEntityId.Value != Guid.Empty)
        {
            var entityExists = await _unitOfWork.TradeEntities.ExistsAsync(request.TradeEntityId.Value, cancellationToken);
            if (!entityExists)
                throw new NotFoundException(nameof(TradeEntity), request.TradeEntityId.Value);
            entityId = request.TradeEntityId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            // Look up existing entity by name, or create a new unverified one
            var existing = await _unitOfWork.TradeEntities.FindByNameAsync(request.EntityName.Trim(), cancellationToken);
            if (existing is not null)
            {
                entityId = existing.Id;
            }
            else
            {
                var newEntity = new TradeEntity
                {
                    LegalName = request.EntityName.Trim(),
                    Country = request.SupplierCountry?.Trim() ?? "Unknown",
                    Region = request.SupplierProvince?.Trim(),
                    EntityType = Domain.Enums.EntityType.Supplier,
                    VerificationStatus = Domain.Enums.VerificationStatus.Unverified,
                    CreatedBy = _currentUserService.UserId
                };
                await _unitOfWork.TradeEntities.AddAsync(newEntity, cancellationToken);
                entityId = newEntity.Id;
            }
        }
        else
        {
            return Result<Guid>.Failure("Either a trade entity ID or entity name is required.");
        }

        var review = new Review
        {
            TradeEntityId = entityId,
            ReviewerId = _currentUserService.UserId,
            ReviewerType = request.ReviewerType,
            TransactionRole = request.TransactionRole,
            Severity = request.Severity,
            Status = ReviewStatus.Pending, // All reviews start as pending
            Title = request.Title,
            Narrative = request.Narrative,
            Product = request.Product,
            ProductCategory = request.ProductCategory,
            IncidentDate = request.IncidentDate,
            OrderValue = request.OrderValue,
            ContactName = request.ContactName,
            ContactPhoneUsed = request.ContactPhoneUsed,
            ContactWeChatUsed = request.ContactWeChatUsed,
            EvidenceLinks = request.EvidenceLinks,
            VerificationEmail = request.VerificationEmail,
            CreatedBy = _currentUserService.UserId
        };

        await _unitOfWork.Reviews.AddAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(review.Id);
    }
}
