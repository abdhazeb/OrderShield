using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Identity;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("AuthPolicy")]
public class AuthController : ControllerBase
{
    private readonly IdentityService _identityService;

    public AuthController(IdentityService identityService)
    {
        _identityService = identityService;
    }

    public record RegisterRequest(
        [Required, StringLength(100, MinimumLength = 2)] string FullName,
        [Required, EmailAddress, StringLength(256)] string Email,
        [Required, StringLength(128, MinimumLength = 10)] string Password,
        Language Language,
        [StringLength(200)] string? Organization = null,
        [StringLength(30)] string? PhoneNumber = null);

    public record LoginRequest(
        [Required, EmailAddress, StringLength(256)] string Email,
        [Required, StringLength(128)] string Password);

    public record RefreshTokenRequest(
        [Required] string UserId,
        [Required] string RefreshToken);

    public record ForgotPasswordRequest(
        [Required, EmailAddress, StringLength(256)] string Email);

    /// <summary>
    /// Register a new user account.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        // Public registration always creates a Buyer account (Admin/ServiceTeam are seeded)
        var safeRole = UserRole.Buyer;

        var (succeeded, userId, token, refreshToken, errors) =
            await _identityService.RegisterAsync(request.FullName, request.Email, request.Password, safeRole, request.Language, request.Organization, request.PhoneNumber, ct);

        if (!succeeded)
            return BadRequest(new { errors });

        return Ok(new { userId, token, refreshToken });
    }

    /// <summary>
    /// Authenticate and receive JWT tokens.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var (succeeded, userId, token, refreshToken, language, errors) =
            await _identityService.LoginAsync(request.Email, request.Password, ct);

        if (!succeeded)
            return Unauthorized(new { errors });

        return Ok(new { userId, token, refreshToken, language });
    }

    /// <summary>
    /// Refresh an expired access token.
    /// </summary>
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var (succeeded, token, refreshToken, errors) =
            await _identityService.RefreshTokenAsync(request.UserId, request.RefreshToken, ct);

        if (!succeeded)
            return Unauthorized(new { errors });

        return Ok(new { token, refreshToken });
    }

    /// <summary>
    /// Logout and revoke refresh token.
    /// </summary>
    [HttpPost("logout")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId is null)
            return Unauthorized();

        await _identityService.LogoutAsync(userId, ct);
        return NoContent();
    }

    /// <summary>
    /// Send a password reset link (demo: always returns success for security).
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await _identityService.ForgotPasswordAsync(request.Email, ct);
        return Ok(new { message = "If an account with that email exists, a reset link has been sent." });
    }
}
