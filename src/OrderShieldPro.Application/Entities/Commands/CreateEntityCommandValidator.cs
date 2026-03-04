using FluentValidation;

namespace OrderShieldPro.Application.Entities.Commands;

public class CreateEntityCommandValidator : AbstractValidator<CreateEntityCommand>
{
    public CreateEntityCommandValidator()
    {
        RuleFor(x => x.LegalName)
            .NotEmpty().WithMessage("Legal name is required.")
            .MaximumLength(300).WithMessage("Legal name must not exceed 300 characters.");

        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required.")
            .MaximumLength(100);

        RuleFor(x => x.EntityType)
            .IsInEnum().WithMessage("Invalid entity type.");

        RuleFor(x => x.TradeName)
            .MaximumLength(300).When(x => x.TradeName is not null);

        RuleFor(x => x.Region)
            .MaximumLength(200).When(x => x.Region is not null);

        RuleFor(x => x.City)
            .MaximumLength(200).When(x => x.City is not null);
    }
}
