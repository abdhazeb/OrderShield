using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.WatchRequests.DTOs;

namespace OrderShieldPro.Application.WatchRequests.Queries;

/// <summary>
/// Get watch requests for the current user.
/// </summary>
public record GetWatchRequestsByUserQuery : IRequest<PaginatedList<WatchRequestDto>>
{
    public string UserId { get; init; } = string.Empty;
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
