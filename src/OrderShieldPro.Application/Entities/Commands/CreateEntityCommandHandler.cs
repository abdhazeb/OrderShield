using MediatR;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Application.Entities.Commands;

public class CreateEntityCommandHandler : IRequestHandler<CreateEntityCommand, Result<Guid>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public CreateEntityCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(CreateEntityCommand request, CancellationToken cancellationToken)
    {
        var entity = new TradeEntity
        {
            LegalName = request.LegalName,
            TradeName = request.TradeName,
            EntityType = request.EntityType,
            Country = request.Country,
            Region = request.Region,
            City = request.City,
            ProductCategories = request.ProductCategories,
            CreatedBy = _currentUserService.UserId
        };

        // Add phone numbers
        foreach (var phone in request.PhoneNumbers.Where(p => !string.IsNullOrWhiteSpace(p)))
        {
            entity.PhoneNumbers.Add(new EntityPhoneNumber
            {
                TradeEntityId = entity.Id,
                PhoneNumber = phone.Trim()
            });
        }

        // Add WeChat IDs
        foreach (var wechat in request.WeChatIds.Where(w => !string.IsNullOrWhiteSpace(w)))
        {
            entity.WeChatIds.Add(new EntityWeChatId
            {
                TradeEntityId = entity.Id,
                WeChatId = wechat.Trim()
            });
        }

        await _unitOfWork.TradeEntities.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(entity.Id);
    }
}
