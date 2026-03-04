using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.EvidenceNotes.Commands;

/// <summary>
/// Add a clarification/evidence note to a review (service team action).
/// </summary>
public record CreateEvidenceNoteCommand : IRequest<Result<Guid>>
{
    public Guid ReviewId { get; init; }
    public string Summary { get; init; } = string.Empty;
    public VerificationStatus VerificationOutcome { get; init; }
    public bool IsPubliclyVisible { get; init; } = true;
}
