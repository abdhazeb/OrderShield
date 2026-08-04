using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Commands;

public class DeleteEntityCommandHandler : IRequestHandler<DeleteEntityCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IApplicationDbContext _context;

    public DeleteEntityCommandHandler(IUnitOfWork unitOfWork, IApplicationDbContext context)
    {
        _unitOfWork = unitOfWork;
        _context = context;
    }

    public async Task<Result> Handle(DeleteEntityCommand request, CancellationToken cancellationToken)
    {
        var entity = await _unitOfWork.TradeEntities.GetByIdAsync(request.Id, cancellationToken);

        if (entity is null)
            throw new NotFoundException(nameof(TradeEntity), request.Id);

        // Reviews are verified business records and the Reviews foreign key is Restrict, so
        // deleting an entity that still has any would fail at the database anyway. Refuse
        // with an actionable message instead of surfacing a constraint violation.
        //
        // This counts reviews in *every* status, not just the published ones. An entity
        // whose profile shows zero reviews can still be undeletable because submissions are
        // sitting in the moderation queue — the denormalized counts on TradeEntity only
        // track published reviews. The failure carries a code so the UI can say that in the
        // reader's own language; the message here is the English fallback for API callers.
        var reviewCount = await _context.Reviews
            .CountAsync(r => r.TradeEntityId == entity.Id, cancellationToken);

        if (reviewCount > 0)
        {
            return Result.Failure(
                $"This entity has {reviewCount} review(s), including any still awaiting " +
                "moderation, and cannot be deleted. Hide it instead, or delete its reviews first.",
                code: "entityHasReviews");
        }

        await _unitOfWork.TradeEntities.RemoveAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
