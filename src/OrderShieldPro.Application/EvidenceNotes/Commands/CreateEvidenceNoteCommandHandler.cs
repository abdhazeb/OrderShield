using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.EvidenceNotes.Commands;

public class CreateEvidenceNoteCommandHandler : IRequestHandler<CreateEvidenceNoteCommand, Result<Guid>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IApplicationDbContext _context;

    public CreateEvidenceNoteCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IApplicationDbContext context)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _context = context;
    }

    public async Task<Result<Guid>> Handle(CreateEvidenceNoteCommand request, CancellationToken cancellationToken)
    {
        var review = await _unitOfWork.Reviews.GetByIdAsync(request.ReviewId, cancellationToken);

        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        var note = new EvidenceNote
        {
            ReviewId = request.ReviewId,
            AuthoredById = _currentUserService.UserId ?? string.Empty,
            Summary = request.Summary,
            VerificationOutcome = request.VerificationOutcome,
            IsPubliclyVisible = request.IsPubliclyVisible,
            CreatedBy = _currentUserService.UserId
        };

        _context.EvidenceNotes.Add(note);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(note.Id);
    }
}
