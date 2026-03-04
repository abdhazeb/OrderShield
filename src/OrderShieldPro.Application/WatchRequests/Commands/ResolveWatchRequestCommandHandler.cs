using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.WatchRequests.Commands;

public class ResolveWatchRequestCommandHandler : IRequestHandler<ResolveWatchRequestCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ResolveWatchRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(ResolveWatchRequestCommand request, CancellationToken cancellationToken)
    {
        var watchRequest = await _context.WatchRequests
            .Include(w => w.Subscribers)
            .FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);

        if (watchRequest is null)
            throw new NotFoundException(nameof(WatchRequest), request.Id);

        watchRequest.Status = request.NewStatus;
        watchRequest.ServiceTeamNotes = request.ServiceTeamNotes;
        watchRequest.ResultEntityId = request.ResultEntityId;
        watchRequest.AssignedToId = _currentUserService.UserId;
        watchRequest.UpdatedBy = _currentUserService.UserId;

        if (request.NewStatus is InvestigationStatus.Completed or InvestigationStatus.Cancelled)
        {
            watchRequest.ResolvedDate = DateTime.UtcNow;

            // Notify the requester
            _context.Notifications.Add(new Notification
            {
                UserId = watchRequest.RequestedById,
                Type = NotificationType.InvestigationComplete,
                Title = "Investigation Complete",
                Message = $"Your investigation request for \"{watchRequest.EntityName}\" has been resolved.",
                ReferenceEntityId = request.ResultEntityId
            });

            // Notify all subscribers
            foreach (var subscriber in watchRequest.Subscribers)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = subscriber.UserId,
                    Type = NotificationType.EnquiryReply,
                    Title = "Supplier Enquiry Complete",
                    Message = $"The enquiry about \"{watchRequest.EntityName}\" that you subscribed to has been resolved.",
                    ReferenceEntityId = request.ResultEntityId
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
