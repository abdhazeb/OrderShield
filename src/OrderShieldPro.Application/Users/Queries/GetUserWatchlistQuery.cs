using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;

namespace OrderShieldPro.Application.Users.Queries;

/// <summary>
/// Get entities the current user is following (watchlist).
/// </summary>
public record GetUserWatchlistQuery : IRequest<PaginatedList<WatchlistItemDto>>
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
