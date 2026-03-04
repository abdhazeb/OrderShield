using FluentValidation;

namespace OrderShieldPro.Application.Entities.Commands;

public class UpdateEntityCommandValidator : AbstractValidator<UpdateEntityCommand>
{
    public UpdateEntityCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("Entity ID is required.");

        RuleFor(x => x.LegalName)
            .NotEmpty().WithMessage("Legal name is required.")
            .MaximumLength(300);

        RuleFor(x => x.Country)
            .NotEmpty().WithMessage("Country is required.")
            .MaximumLength(100);

        RuleFor(x => x.EntityType)
            .IsInEnum().WithMessage("Invalid entity type.");
    }
}
