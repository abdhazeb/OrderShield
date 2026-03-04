using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Users.Commands;
using OrderShieldPro.Application.Users.Queries;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly IMediator _mediator;

    public UserProfileController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get the current user's profile.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetUserProfileQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Update the current user's profile.
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Update the current user's language preference.
    /// </summary>
    [HttpPut("language")]
    public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new UpdateLanguageCommand(request.Language), ct);
        return result.Succeeded ? NoContent() : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Get the current user's watchlist (followed entities).
    /// </summary>
    [HttpGet("watchlist")]
    public async Task<IActionResult> GetWatchlist([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetUserWatchlistQuery
        {
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(result);
    }

    public record UpdateLanguageRequest(Language Language);
}
