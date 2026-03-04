using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;

namespace OrderShieldPro.Application.Entities.Queries;

/// <summary>
/// Get full entity details by ID — for Entity Profile page.
/// </summary>
public record GetEntityByIdQuery(Guid Id) : IRequest<Result<EntityDetailDto>>;
