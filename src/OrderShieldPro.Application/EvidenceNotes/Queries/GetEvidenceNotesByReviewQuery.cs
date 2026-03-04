using MediatR;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.EvidenceNotes.Queries;

/// <summary>
/// Get all evidence notes for a specific review.
/// </summary>
public record GetEvidenceNotesByReviewQuery(Guid ReviewId) : IRequest<IReadOnlyList<EvidenceNoteDto>>;
