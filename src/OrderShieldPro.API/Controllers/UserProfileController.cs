using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Common.Interfaces;
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
    private readonly IFileStorageService _fileStorage;

    public UserProfileController(IMediator mediator, IFileStorageService fileStorage)
    {
        _mediator = mediator;
        _fileStorage = fileStorage;
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

    /// <summary>
    /// Upload business license file for verification.
    /// </summary>
    [HttpPost("business-license")]
    public async Task<IActionResult> UploadBusinessLicense(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { errors = new[] { "No file provided." } });

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { errors = new[] { "File must be under 10 MB." } });

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(new { errors = new[] { "File type not allowed." } });

        var savedPath = await _fileStorage.UploadFileAsync(file.OpenReadStream(), file.FileName, file.ContentType, ct);
        return Ok(new { filePath = savedPath });
    }
}
