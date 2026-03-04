using MediatR;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Commands;

public class UpdateEntityCommandHandler : IRequestHandler<UpdateEntityCommand, Result>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateEntityCommandHandler(IUnitOfWork unitOfWork, IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(UpdateEntityCommand request, CancellationToken cancellationToken)
    {
        var entity = await _unitOfWork.TradeEntities.GetByIdWithDetailsAsync(request.Id, cancellationToken);

        if (entity is null)
            throw new NotFoundException(nameof(TradeEntity), request.Id);

        // Track old name as historical if it changed
        if (!string.Equals(entity.LegalName, request.LegalName, StringComparison.OrdinalIgnoreCase))
        {
            entity.HistoricalNames.Add(new EntityHistoricalName
            {
                TradeEntityId = entity.Id,
                PreviousName = entity.LegalName,
                ChangedDate = DateTime.UtcNow
            });
        }

        entity.LegalName = request.LegalName;
        entity.TradeName = request.TradeName;
        entity.EntityType = request.EntityType;
        entity.Country = request.Country;
        entity.Region = request.Region;
        entity.City = request.City;
        entity.ProductCategories = request.ProductCategories;
        entity.UpdatedBy = _currentUserService.UserId;

        // Update phone numbers — replace all
        entity.PhoneNumbers.Clear();
        foreach (var phone in request.PhoneNumbers.Where(p => !string.IsNullOrWhiteSpace(p)))
        {
            entity.PhoneNumbers.Add(new EntityPhoneNumber
            {
                TradeEntityId = entity.Id,
                PhoneNumber = phone.Trim()
            });
        }

        // Update WeChat IDs — replace all
        entity.WeChatIds.Clear();
        foreach (var wechat in request.WeChatIds.Where(w => !string.IsNullOrWhiteSpace(w)))
        {
            entity.WeChatIds.Add(new EntityWeChatId
            {
                TradeEntityId = entity.Id,
                WeChatId = wechat.Trim()
            });
        }

        await _unitOfWork.TradeEntities.UpdateAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
