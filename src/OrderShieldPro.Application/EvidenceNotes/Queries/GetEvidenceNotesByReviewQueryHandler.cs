using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.EvidenceNotes.Queries;

public class GetEvidenceNotesByReviewQueryHandler : IRequestHandler<GetEvidenceNotesByReviewQuery, IReadOnlyList<EvidenceNoteDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEvidenceNotesByReviewQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<EvidenceNoteDto>> Handle(GetEvidenceNotesByReviewQuery request, CancellationToken cancellationToken)
    {
        return await _context.EvidenceNotes
            .Where(n => n.ReviewId == request.ReviewId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new EvidenceNoteDto
            {
                Id = n.Id,
                Summary = n.Summary,
                VerificationOutcome = n.VerificationOutcome,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }
}
