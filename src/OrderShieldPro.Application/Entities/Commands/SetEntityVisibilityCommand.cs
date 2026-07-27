using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Entities.Commands;

/// <summary>
/// Hides or restores an entity. Hiding withholds it from public search and profile pages
/// without destroying anything — the reversible alternative to deletion.
/// </summary>
public record SetEntityVisibilityCommand(Guid Id, bool IsHidden) : IRequest<Result>;
