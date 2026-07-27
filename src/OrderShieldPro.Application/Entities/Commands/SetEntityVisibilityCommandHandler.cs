using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Commands;

public class SetEntityVisibilityCommandHandler : IRequestHandler<SetEntityVisibilityCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public SetEntityVisibilityCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(SetEntityVisibilityCommand request, CancellationToken cancellationToken)
    {
        var entity = await _unitOfWork.TradeEntities.GetByIdAsync(request.Id, cancellationToken);

        if (entity is null)
            throw new NotFoundException(nameof(TradeEntity), request.Id);

        if (entity.IsHidden == request.IsHidden)
            return Result.Success();

        entity.IsHidden = request.IsHidden;
        entity.UpdatedBy = _currentUserService.UserId;

        await _unitOfWork.TradeEntities.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
