using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Subscriptions.Commands;

/// <summary>
/// Admin rejects a pending subscription request.
/// </summary>
public record RejectSubscriptionRequestCommand(Guid RequestId, string? AdminNotes) : IRequest<Result>;
