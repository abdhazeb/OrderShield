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

        RuleFor(x => x.TransactionRole)
            .NotEmpty().WithMessage("Transaction role is required.")
            .MaximumLength(200);

        RuleFor(x => x.Severity)
            .IsInEnum().WithMessage("Severity level is required.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Review title is required.")
            .MaximumLength(500).WithMessage("Title must not exceed 500 characters.");

        RuleFor(x => x.Narrative)
            .NotEmpty().WithMessage("Narrative is required.")
            .MinimumLength(100).WithMessage("Narrative must be at least 100 characters.")
            .MaximumLength(10000).WithMessage("Narrative must not exceed 10,000 characters.");

        RuleFor(x => x.IncidentDate)
            .NotEmpty().WithMessage("Incident date is required.")
            .LessThanOrEqualTo(DateTime.UtcNow).WithMessage("Incident date cannot be in the future.");

        RuleFor(x => x.VerificationEmail)
            .NotEmpty().WithMessage("Verification email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.OrderValue)
            .GreaterThan(0).When(x => x.OrderValue.HasValue)
            .WithMessage("Order value must be positive.");
    }
}
