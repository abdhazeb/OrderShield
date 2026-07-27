using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Subscriptions.DTOs;

namespace OrderShieldPro.Application.Subscriptions.Queries;

/// <summary>
/// Resolves the payment proof file for a subscription request, after checking that the
/// caller is allowed to see it. Files are addressed by request id rather than by stored
/// file name so that they cannot be enumerated or guessed.
/// </summary>
public record GetPaymentProofQuery(Guid RequestId) : IRequest<Result<PaymentProofDto>>;
