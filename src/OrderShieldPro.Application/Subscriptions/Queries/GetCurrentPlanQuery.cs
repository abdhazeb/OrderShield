using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

/// <summary>
/// Get the current user's subscription.
/// </summary>
public record GetCurrentPlanQuery : IRequest<Result<CurrentSubscriptionDto>>;
