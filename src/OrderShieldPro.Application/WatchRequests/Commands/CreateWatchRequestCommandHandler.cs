using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.WatchRequests.Commands;

public class CreateWatchRequestCommandHandler : IRequestHandler<CreateWatchRequestCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateWatchRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(CreateWatchRequestCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.IsAuthenticated || _currentUserService.UserId is null)
            return Result<Guid>.Failure("You must be authenticated to submit an enquiry.");

        var watchRequest = new WatchRequest
        {
            RequestedById = _currentUserService.UserId,
            EntityName = request.EntityName,
            EntityPhone = request.EntityPhone,
            EntityWeChat = request.EntityWeChat,
            EntityWebsite = request.EntityWebsite,
            EntityCountry = request.EntityCountry,
            AdditionalDetails = request.AdditionalDetails,
            EnquiryChecklist = request.EnquiryChecklist,
            CreatedBy = _currentUserService.UserId
        };

        _context.WatchRequests.Add(watchRequest);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(watchRequest.Id);
    }
}
