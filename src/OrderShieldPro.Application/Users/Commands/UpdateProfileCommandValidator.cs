using FluentValidation;

namespace OrderShieldPro.Application.Users.Commands;

public class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(200);

        RuleFor(x => x.Region)
            .MaximumLength(200).When(x => x.Region is not null);
    }
}
