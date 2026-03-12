using FluentValidation;

namespace OrderShieldPro.Application.Reviews.Commands;

public class CreateReviewCommandValidator : AbstractValidator<CreateReviewCommand>
{
    public CreateReviewCommandValidator()
    {
        RuleFor(x => x)
            .Must(x => (x.TradeEntityId.HasValue && x.TradeEntityId != Guid.Empty) || !string.IsNullOrWhiteSpace(x.EntityName))
            .WithMessage("Either a trade entity ID or entity name is required.");

        RuleFor(x => x.ReviewerType)
            .IsInEnum().WithMessage("Reviewer type is required.");

        RuleFor(x => x.Severity)
            .IsInEnum().WithMessage("Severity level is required.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Review title is required.")
            .MaximumLength(500).WithMessage("Title must not exceed 500 characters.");

        RuleFor(x => x.Narrative)
            .NotEmpty().WithMessage("Narrative is required.")
            .MinimumLength(50).WithMessage("Narrative must be at least 50 characters.")
            .MaximumLength(10000).WithMessage("Narrative must not exceed 10,000 characters.");

        RuleFor(x => x.IncidentDate)
            .LessThanOrEqualTo(DateTime.UtcNow).When(x => x.IncidentDate != default)
            .WithMessage("Incident date cannot be in the future.");

        RuleFor(x => x.ProductCategory)
            .NotEmpty().WithMessage("Business category is required.");
    }
}
