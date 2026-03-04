using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Entities.Commands;
using OrderShieldPro.Application.Entities.Queries;
using OrderShieldPro.Application.Reviews.Queries;
using OrderShieldPro.Application.Users.Commands;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EntitiesController : ControllerBase
{
    private readonly IMediator _mediator;

    public EntitiesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Search entities by name, phone, WeChat with filters and pagination.
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] EntityType? entityType,
        [FromQuery] string? country,
        [FromQuery] string? productCategory,
        [FromQuery] SeverityLevel? severity,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new SearchEntitiesQuery
        {
            SearchTerm = q,
            EntityType = entityType,
            Country = country,
            ProductCategory = productCategory,
            SeverityFilter = severity,
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Get full entity details by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetEntityByIdQuery(id), ct);
        return Ok(result.Data);
    }

    /// <summary>
    /// Get review timeline for an entity.
    /// </summary>
    [HttpGet("{id:guid}/reviews")]
    public async Task<IActionResult> GetReviewTimeline(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetReviewsByEntityQuery
        {
            TradeEntityId = id,
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(result);
    }

    /// <summary>
    /// Follow (add to watchlist) an entity.
    /// </summary>
    [HttpPost("{id:guid}/follow")]
    [Authorize]
    public async Task<IActionResult> FollowEntity(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new FollowEntityCommand(id), ct);
        return result.Succeeded ? Ok() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Unfollow (remove from watchlist) an entity.
    /// </summary>
    [HttpDelete("{id:guid}/follow")]
    [Authorize]
    public async Task<IActionResult> UnfollowEntity(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new UnfollowEntityCommand(id), ct);
        return result.Succeeded ? Ok() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Create a new trade entity (admin/service team).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateEntityCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Data }, result.Data)
            : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Update an existing trade entity (admin/service team).
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEntityCommand command, CancellationToken ct)
    {
        if (id != command.Id)
            return BadRequest(new { errors = new[] { "Route ID does not match body ID." } });

        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }
}
