using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;

namespace OrderShieldPro.Application.Entities.Queries;

/// <summary>
/// Entities withdrawn from public search and profile pages (IsHidden == true) — for the
/// admin "Hidden Content" management screen, where a moderator can restore them.
/// </summary>
public record GetHiddenEntitiesQuery : IRequest<PaginatedList<HiddenEntityDto>>
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
