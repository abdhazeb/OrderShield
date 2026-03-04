using FluentValidation;

namespace OrderShieldPro.Application.Reviews.Commands;

public class UpdateReviewStatusCommandValidator : AbstractValidator<UpdateReviewStatusCommand>
{
    public UpdateReviewStatusCommandValidator()
    {
        RuleFor(x => x.ReviewId)
            .NotEmpty().WithMessage("Review ID is required.");

        RuleFor(x => x.NewStatus)
            .IsInEnum().WithMessage("Invalid review status.");
    }
}
