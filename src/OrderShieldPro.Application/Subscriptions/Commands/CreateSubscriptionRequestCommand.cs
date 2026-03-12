using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Subscriptions.Commands;

/// <summary>
/// User submits a subscription request with payment proof.
/// </summary>
public record CreateSubscriptionRequestCommand : IRequest<Result<Guid>>
{
    public SubscriptionTier RequestedTier { get; init; }
    public int DurationYears { get; init; }
    public string PaymentProofFileName { get; init; } = string.Empty;
    public string PaymentProofStoragePath { get; init; } = string.Empty;
    public string? PaymentNotes { get; init; }
}
