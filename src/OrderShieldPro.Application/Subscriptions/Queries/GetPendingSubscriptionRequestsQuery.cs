using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

/// <summary>
/// Admin query: get all pending subscription requests.
/// </summary>
public record GetPendingSubscriptionRequestsQuery : IRequest<Result<List<SubscriptionRequestDto>>>;
