using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Update review status (service team moderation: publish, amend, reject).
/// </summary>
public record UpdateReviewStatusCommand : IRequest<Result>
{
    public Guid ReviewId { get; init; }
    public ReviewStatus NewStatus { get; init; }
}
