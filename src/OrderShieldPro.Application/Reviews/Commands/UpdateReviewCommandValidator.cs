using FluentValidation;

namespace OrderShieldPro.Application.Reviews.Commands;

public class UpdateReviewCommandValidator : AbstractValidator<UpdateReviewCommand>
{
    public UpdateReviewCommandValidator()
    {
        RuleFor(x => x.ReviewId)
            .NotEmpty().WithMessage("Review id is required.");

        RuleFor(x => x.Severity)
            .IsInEnum().WithMessage("Severity level is required.");

        // Title is required for full reviews only. Comments may omit a title.
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Review title is required.")
            .When(x => !x.IsComment);
        RuleFor(x => x.Title)
            .MaximumLength(500).WithMessage("Title must not exceed 500 characters.");

        // Comments allow a shorter narrative (min 10 chars) than full reviews (min 50).
        RuleFor(x => x.Narrative)
            .NotEmpty().WithMessage("Narrative is required.")
            .MinimumLength(10).WithMessage("Comment must be at least 10 characters.")
            .MaximumLength(10000).WithMessage("Narrative must not exceed 10,000 characters.")
            .When(x => x.IsComment);
        RuleFor(x => x.Narrative)
            .NotEmpty().WithMessage("Narrative is required.")
            .MinimumLength(50).WithMessage("Narrative must be at least 50 characters.")
            .MaximumLength(10000).WithMessage("Narrative must not exceed 10,000 characters.")
            .When(x => !x.IsComment);

        RuleFor(x => x.IncidentDate)
            .LessThanOrEqualTo(DateTime.UtcNow).When(x => x.IncidentDate != default)
            .WithMessage("Incident date cannot be in the future.");

        RuleFor(x => x.ProductCategory)
            .NotEmpty().WithMessage("Business category is required.")
            .When(x => !x.IsComment);
    }
}
