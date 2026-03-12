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

        RuleFor(x => x.BusinessName)
            .MaximumLength(300).When(x => x.BusinessName is not null);

        RuleFor(x => x.LicenseAddress)
            .MaximumLength(500).When(x => x.LicenseAddress is not null);

        RuleFor(x => x.BusinessPhone)
            .MaximumLength(30).When(x => x.BusinessPhone is not null);
    }
}
