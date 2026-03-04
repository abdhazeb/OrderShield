using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// Get reviews for a trade entity — Entity Profile review timeline.
/// </summary>
public record GetReviewsByEntityQuery : IRequest<PaginatedList<ReviewDto>>
{
    public Guid TradeEntityId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
