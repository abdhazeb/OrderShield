using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// Reviews withdrawn from public view (Status == Hidden) — for the admin "Hidden Content"
/// management screen, where a moderator can restore or permanently delete them.
/// </summary>
public record GetHiddenReviewsQuery : IRequest<PaginatedList<ReviewDto>>
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
