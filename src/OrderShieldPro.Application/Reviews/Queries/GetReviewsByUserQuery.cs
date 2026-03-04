using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// Get reviews submitted by a specific user — My Reviews screen.
/// </summary>
public record GetReviewsByUserQuery : IRequest<PaginatedList<ReviewDto>>
{
    public string UserId { get; init; } = string.Empty;
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
