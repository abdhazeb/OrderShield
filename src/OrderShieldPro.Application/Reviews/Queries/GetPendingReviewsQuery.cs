using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// Get pending reviews for service team moderation queue.
/// </summary>
public record GetPendingReviewsQuery : IRequest<PaginatedList<ReviewDto>>
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
