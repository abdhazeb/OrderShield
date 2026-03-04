using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Commands;

/// <summary>
/// Change the current user's subscription plan.
/// </summary>
public record ChangePlanCommand(SubscriptionTier NewTier) : IRequest<Result>;
