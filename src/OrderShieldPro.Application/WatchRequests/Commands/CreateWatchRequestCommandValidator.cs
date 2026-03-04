using FluentValidation;

namespace OrderShieldPro.Application.WatchRequests.Commands;

public class CreateWatchRequestCommandValidator : AbstractValidator<CreateWatchRequestCommand>
{
    public CreateWatchRequestCommandValidator()
    {
        RuleFor(x => x.EntityName)
            .NotEmpty().WithMessage("Entity name is required.")
            .MaximumLength(300);

        RuleFor(x => x.AdditionalDetails)
            .MaximumLength(2000).When(x => x.AdditionalDetails is not null);
    }
}
