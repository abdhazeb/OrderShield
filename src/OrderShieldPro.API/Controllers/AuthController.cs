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

    public record ResetPasswordRequest(
        [Required, EmailAddress, StringLength(256)] string Email,
        [Required] string Token,
        [Required, StringLength(128, MinimumLength = 10)] string NewPassword);

    /// <summary>
    /// Register a new user account.
    /// New public registrations are created in a pending state and require SuperAdmin approval before login.
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

        // The account is created but inactive; SuperAdmin approval is required before sign-in.
        return Ok(new
        {
            userId,
            token,
            refreshToken,
            pendingApproval = token == null,
            message = token == null
                ? "Your account has been created and is awaiting approval by a SuperAdmin. You will be notified by email once approved."
                : null
        });
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
    /// Email a password reset link. Always reports success so the response cannot be used
    /// to discover which addresses have accounts.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await _identityService.ForgotPasswordAsync(request.Email, ct);
        return Ok(new { message = "If an account with that email exists, a reset link has been sent." });
    }

    /// <summary>
    /// Complete a password reset using the token from the emailed link.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _identityService.ResetPasswordAsync(
            request.Email, request.Token, request.NewPassword, ct);

        return result.Succeeded
            ? Ok(new { message = "Your password has been reset. You can now sign in." })
            : BadRequest(new { result.Errors });
    }
}
