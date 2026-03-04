using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Entities.Queries;

/// <summary>
/// Search entities by name, phone, WeChat, with filters and pagination.
/// </summary>
public record SearchEntitiesQuery : IRequest<PaginatedList<EntitySearchResultDto>>
{
    public string? SearchTerm { get; init; }
    public EntityType? EntityType { get; init; }
    public string? Country { get; init; }
    public string? ProductCategory { get; init; }
    public SeverityLevel? SeverityFilter { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; } // "recent", "reviews", "name"
}
