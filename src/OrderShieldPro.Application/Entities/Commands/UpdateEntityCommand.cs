using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Entities.Commands;

/// <summary>
/// Update an existing trade entity.
/// </summary>
public record UpdateEntityCommand : IRequest<Result>
{
    public Guid Id { get; init; }
    public string LegalName { get; init; } = string.Empty;
    public string? TradeName { get; init; }
    public EntityType EntityType { get; init; }
    public string Country { get; init; } = string.Empty;
    public string? Region { get; init; }
    public string? City { get; init; }
    public string? ProductCategories { get; init; }
    public List<string> PhoneNumbers { get; init; } = new();
    public List<string> WeChatIds { get; init; } = new();
}
