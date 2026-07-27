using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Entities.Commands;

/// <summary>
/// Permanently deletes an entity. Refused when the entity still has reviews — those are
/// verified business records, so the caller is directed to hide the entity instead.
/// </summary>
public record DeleteEntityCommand(Guid Id) : IRequest<Result>;
