using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

/// <summary>
/// Get subscription pricing options based on system settings.
/// </summary>
public record GetSubscriptionPricingQuery : IRequest<Result<List<SubscriptionPricingDto>>>;
