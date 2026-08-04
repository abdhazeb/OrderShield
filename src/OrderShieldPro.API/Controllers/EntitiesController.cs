using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderShieldPro.Application.Entities.Commands;
using OrderShieldPro.Application.Entities.Queries;
using OrderShieldPro.Application.Reviews.Queries;
using OrderShieldPro.Application.Users.Commands;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("GeneralPolicy")]
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
        [FromQuery] bool includeHidden = false,
        CancellationToken ct = default)
    {
        // includeHidden is a moderator-only capability — a public caller asking for it is
        // simply served the public result set rather than an error, so the flag can never
        // be used to probe for hidden entities.
        var isModerator = User.IsInRole("ServiceTeam") || User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

        var result = await _mediator.Send(new SearchEntitiesQuery
        {
            IncludeHidden = includeHidden && isModerator,
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

    /// <summary>
    /// Bulk-import entities from an uploaded spreadsheet (Cantoon or Qicha export
    /// template — format is auto-detected). Rows whose legal name already exists, in the
    /// file or in the database, are skipped rather than creating a duplicate.
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Import(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { errors = new[] { "A file is required." } });

        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".xls", ".xlsx" };
        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            return BadRequest(new { errors = new[] { "Only .xls or .xlsx files are supported." } });

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);

        var result = await _mediator.Send(new ImportEntitiesCommand(stream.ToArray(), file.FileName), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// List hidden entities (admin/service team) — the "Hidden Content" management screen.
    /// </summary>
    [HttpGet("hidden")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> GetHidden([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetHiddenEntitiesQuery { Page = page, PageSize = pageSize }, ct);
        return Ok(result);
    }

    /// <summary>
    /// Hide or restore an entity (admin/service team). Hidden entities disappear from
    /// public search and profile pages but are not destroyed.
    /// </summary>
    [HttpPut("{id:guid}/visibility")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> SetVisibility(Guid id, [FromBody] SetVisibilityRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new SetEntityVisibilityCommand(id, request.IsHidden), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Permanently delete an entity (admin/service team). Refused if the entity still has
    /// reviews — hide it instead.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new DeleteEntityCommand(id), ct);
        // Code travels with the errors here: the refusal is shown to a moderator in their
        // own language, and the frontend keys the translation off the code rather than
        // parsing the English sentence.
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors, result.Code });
    }

    public record SetVisibilityRequest(bool IsHidden);
}
