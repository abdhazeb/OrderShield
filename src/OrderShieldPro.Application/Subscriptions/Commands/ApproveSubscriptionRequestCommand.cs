using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Subscriptions.Commands;

/// <summary>
/// Admin approves a pending subscription request.
/// </summary>
public record ApproveSubscriptionRequestCommand(Guid RequestId, string? AdminNotes) : IRequest<Result>;
