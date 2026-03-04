using FluentValidation;

namespace OrderShieldPro.Application.EvidenceNotes.Commands;

public class CreateEvidenceNoteCommandValidator : AbstractValidator<CreateEvidenceNoteCommand>
{
    public CreateEvidenceNoteCommandValidator()
    {
        RuleFor(x => x.ReviewId)
            .NotEmpty().WithMessage("Review ID is required.");

        RuleFor(x => x.Summary)
            .NotEmpty().WithMessage("Summary is required.")
            .MaximumLength(5000).WithMessage("Summary must not exceed 5,000 characters.");

        RuleFor(x => x.VerificationOutcome)
            .IsInEnum().WithMessage("Invalid verification outcome.");
    }
}
