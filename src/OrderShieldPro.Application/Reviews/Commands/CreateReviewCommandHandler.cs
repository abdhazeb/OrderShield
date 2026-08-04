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
    private readonly INotificationService _notificationService;

    public CreateReviewCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        INotificationService notificationService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
    }

    public async Task<Result<Guid>> Handle(CreateReviewCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated || _currentUserService.UserId is null)
            return Result<Guid>.Failure("You must be authenticated to submit a review.");

        // Resolve entity: by ID if provided, else look up or create by name
        TradeEntity entity;
        if (request.TradeEntityId.HasValue && request.TradeEntityId.Value != Guid.Empty)
        {
            // Loaded with details rather than a bare existence check, because the extra
            // names and phone numbers below have to be merged against what is already there.
            var selected = await _unitOfWork.TradeEntities.GetByIdWithDetailsAsync(request.TradeEntityId.Value, cancellationToken);
            if (selected is null)
                throw new NotFoundException(nameof(TradeEntity), request.TradeEntityId.Value);
            entity = selected;
        }
        else if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            // Look up existing entity by name — including the alternative names supplied
            // with this review, so a reviewer who knows the entity only by its other name
            // still lands on the existing record instead of creating a second one.
            var candidateNames = new[] { request.EntityName }
                .Concat(request.AlternativeEntityNames)
                .Select(n => n?.Trim())
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => n!)
                .ToList();

            TradeEntity? existing = null;
            foreach (var candidate in candidateNames)
            {
                existing = await _unitOfWork.TradeEntities.FindByNameAsync(candidate, cancellationToken);
                if (existing is not null) break;
            }

            if (existing is not null)
            {
                // FindByNameAsync returns the row without its collections; the merge below
                // needs them loaded or it would re-add names and phones that already exist.
                entity = await _unitOfWork.TradeEntities.GetByIdWithDetailsAsync(existing.Id, cancellationToken)
                         ?? existing;
            }
            else
            {
                entity = new TradeEntity
                {
                    LegalName = request.EntityName.Trim(),
                    Country = request.SupplierCountry?.Trim() ?? "Unknown",
                    Region = request.SupplierProvince?.Trim(),
                    EntityType = Domain.Enums.EntityType.Supplier,
                    VerificationStatus = Domain.Enums.VerificationStatus.Unverified,
                    CreatedBy = _currentUserService.UserId
                };
                await _unitOfWork.TradeEntities.AddAsync(entity, cancellationToken);
            }
        }
        else
        {
            return Result<Guid>.Failure("Either a trade entity ID or entity name is required.");
        }

        var entityId = entity.Id;
        MergeAlternativeNames(entity, request.EntityName, request.AlternativeEntityNames);
        MergePhoneNumbers(entity, request.ContactPhoneUsed, request.AdditionalPhoneNumbers);

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
            ContactPosition = request.ContactPosition,
            ContactPhoneUsed = request.ContactPhoneUsed,
            ContactWeChatUsed = request.ContactWeChatUsed,
            EvidenceLinks = request.EvidenceLinks,
            VerificationEmail = request.VerificationEmail,
            CreatedBy = _currentUserService.UserId
        };

        await _unitOfWork.Reviews.AddAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify SuperAdmins that a new review needs moderation.
        await _notificationService.NotifySuperAdminsAsync(
            NotificationType.NewReviewPendingApproval,
            "New review awaiting approval",
            $"A new review \"{review.Title}\" was submitted and needs moderation.",
            referenceEntityId: review.TradeEntityId,
            referenceReviewId: review.Id,
            templateKey: "newReviewPendingApproval",
            subject: review.Title,
            cancellationToken: cancellationToken);

        return Result<Guid>.Success(review.Id);
    }

    /// <summary>
    /// Records every name the reviewer gave for the entity that isn't already on file.
    /// These are stored as historical names — the same rows the rebrand tracking uses —
    /// because entity search already matches them, which is the whole point: an entity
    /// known under three names has to be findable under all three.
    /// </summary>
    private static void MergeAlternativeNames(TradeEntity entity, string? submittedName, IEnumerable<string> alternatives)
    {
        var known = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { entity.LegalName };
        if (!string.IsNullOrWhiteSpace(entity.TradeName))
            known.Add(entity.TradeName!.Trim());
        foreach (var existing in entity.HistoricalNames)
            known.Add(existing.PreviousName.Trim());

        // The typed name counts as an alias too when the entity was matched on one of the
        // alternatives instead — otherwise the name that found it would go unrecorded.
        var candidates = new[] { submittedName }.Concat(alternatives);

        foreach (var candidate in candidates)
        {
            var name = candidate?.Trim();
            if (string.IsNullOrWhiteSpace(name) || !known.Add(name)) continue;

            entity.HistoricalNames.Add(new EntityHistoricalName
            {
                TradeEntityId = entity.Id,
                PreviousName = name,
                ChangedDate = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Adds any number the reviewer dealt with that the entity doesn't already carry.
    /// A phone number outlives a company name, so it is the most reliable way to search
    /// for an entity that has rebranded.
    /// </summary>
    private static void MergePhoneNumbers(TradeEntity entity, string? contactPhone, IEnumerable<string> additional)
    {
        var known = new HashSet<string>(
            entity.PhoneNumbers.Select(p => p.PhoneNumber.Trim()),
            StringComparer.OrdinalIgnoreCase);

        foreach (var candidate in new[] { contactPhone }.Concat(additional))
        {
            var phone = candidate?.Trim();
            if (string.IsNullOrWhiteSpace(phone) || !phone.Any(char.IsDigit) || !known.Add(phone)) continue;

            entity.PhoneNumbers.Add(new EntityPhoneNumber
            {
                TradeEntityId = entity.Id,
                PhoneNumber = phone,
                IsPrimary = entity.PhoneNumbers.Count == 0
            });
        }
    }
}
