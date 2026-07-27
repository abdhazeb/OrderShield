using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Services;

namespace OrderShieldPro.Infrastructure.Identity;

/// <summary>
/// High-level identity operations wrapping ASP.NET Core Identity.
/// </summary>
public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IApplicationDbContext _dbContext;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<IdentityService> _logger;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtTokenService jwtTokenService,
        IApplicationDbContext dbContext,
        INotificationService notificationService,
        IEmailService emailService,
        IOptions<EmailSettings> emailSettings,
        ILogger<IdentityService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtTokenService = jwtTokenService;
        _dbContext = dbContext;
        _notificationService = notificationService;
        _emailService = emailService;
        _emailSettings = emailSettings.Value;
        _logger = logger;
    }

    public async Task<(bool Succeeded, string? UserId, string? Token, string? RefreshToken, string[] Errors)> RegisterAsync(
        string fullName, string email, string password, UserRole role, Language language, string? organization = null, string? phoneNumber = null, CancellationToken cancellationToken = default)
    {
        // Read free trial days from system settings (default 365)
        var freeTrialSetting = await _dbContext.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == "free_trial_days", cancellationToken);
        var freeTrialDays = int.TryParse(freeTrialSetting?.Value, out var days) ? days : 365;

        var user = new ApplicationUser
        {
            FullName = fullName,
            Email = email,
            UserName = email,
            PhoneNumber = phoneNumber,
            Role = role,
            LanguagePreference = language,
            Organization = organization,
            SubscriptionTier = SubscriptionTier.Free,
            SubscriptionExpiryDate = DateTime.UtcNow.AddDays(freeTrialDays),
            // Public registrations require SuperAdmin approval before they can sign in.
            // (Seeded admin/service-team accounts and admins created via /admin/team are activated explicitly.)
            IsActive = false,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            return (false, null, null, null, result.Errors.Select(e => e.Description).ToArray());
        }

        // Notify all SuperAdmins so they can approve or reject the new account.
        await _notificationService.NotifySuperAdminsAsync(
            Domain.Enums.NotificationType.NewUserPendingApproval,
            "New user awaiting approval",
            $"{fullName} ({email}) registered and is waiting for approval.",
            templateKey: "newUserPendingApproval",
            subject: $"{fullName} ({email})",
            cancellationToken: cancellationToken);

        // Do NOT issue tokens — the user must wait for SuperAdmin approval.
        return (true, user.Id, null, null, Array.Empty<string>());
    }

    public async Task<(bool Succeeded, string? UserId, string? Token, string? RefreshToken, string? Language, string[] Errors)> LoginAsync(
        string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            return (false, null, null, null, null, new[] { "Invalid email or password." });
        }
        if (!user.IsActive)
        {
            // Distinguish "awaiting approval" (never logged in) from a frozen account.
            // Both block sign-in, but the message guides the user.
            var msg = user.LockoutEnabled && user.AccessFailedCount > 0
                ? "Your account has been deactivated. Please contact support."
                : "Your account is awaiting approval by a SuperAdmin.";
            return (false, null, null, null, null, new[] { msg });
        }

        // Check if account is locked out
        if (await _userManager.IsLockedOutAsync(user))
        {
            return (false, null, null, null, null, new[] { "Account is temporarily locked due to too many failed attempts. Please try again later." });
        }

        // Use SignInManager to check password with lockout tracking
        var signInResult = await _signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        if (signInResult.IsLockedOut)
        {
            return (false, null, null, null, null, new[] { "Account is temporarily locked due to too many failed attempts. Please try again later." });
        }
        if (!signInResult.Succeeded)
        {
            return (false, null, null, null, null, new[] { "Invalid email or password." });
        }

        // Generate tokens
        var accessToken = _jwtTokenService.GenerateAccessToken(
            user.Id, user.Email!, user.Role.ToString(), user.SubscriptionTier.ToString());
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        // Store refresh token
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var language = user.LanguagePreference.ToString().ToLowerInvariant();
        return (true, user.Id, accessToken, refreshToken, language, Array.Empty<string>());
    }

    public async Task<(bool Succeeded, string? Token, string? RefreshToken, string[] Errors)> RefreshTokenAsync(
        string userId, string refreshToken, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || !user.IsActive)
        {
            return (false, null, null, new[] { "User not found." });
        }

        if (user.RefreshToken != refreshToken || user.RefreshTokenExpiresAt < DateTime.UtcNow)
        {
            return (false, null, null, new[] { "Invalid or expired refresh token." });
        }

        // Generate new tokens
        var newAccessToken = _jwtTokenService.GenerateAccessToken(
            user.Id, user.Email!, user.Role.ToString(), user.SubscriptionTier.ToString());
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

        // Rotate refresh token
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return (true, newAccessToken, newRefreshToken, Array.Empty<string>());
    }

    public async Task<bool> LogoutAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null) return false;

        // Revoke refresh token
        user.RefreshToken = null;
        user.RefreshTokenExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return true;
    }

    // IIdentityService implementations

    public async Task<Result> UpdateProfileAsync(string userId, string fullName, string? region, string? businessName = null, string? licenseAddress = null, string? businessPhone = null, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Result.Failure("User not found.");

        user.FullName = fullName;
        user.Region = region;
        user.BusinessName = businessName;
        user.LicenseAddress = licenseAddress;
        user.BusinessPhone = businessPhone;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded
            ? Result.Success()
            : Result.Failure(result.Errors.Select(e => e.Description));
    }

    public async Task<Result> UpdateLanguageAsync(string userId, string language, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Result.Failure("User not found.");

        if (Enum.TryParse<Language>(language, true, out var lang))
        {
            user.LanguagePreference = lang;
            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
            return Result.Success();
        }

        return Result.Failure($"Invalid language: {language}");
    }

    public async Task<UserProfileDto?> GetUserProfileAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return null;

        return new UserProfileDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = user.Role,
            Region = user.Region,
            LanguagePreference = user.LanguagePreference,
            SubscriptionTier = user.SubscriptionTier,
            SubscriptionExpiryDate = user.SubscriptionExpiryDate,
            TrustScore = user.TrustScore,
            CreatedAt = user.CreatedAt,
            PhoneNumber = user.PhoneNumber,
            BusinessName = user.BusinessName,
            LicenseAddress = user.LicenseAddress,
            BusinessPhone = user.BusinessPhone,
            BusinessLicenseFilePath = user.BusinessLicenseFilePath,
            IsBusinessVerified = user.IsBusinessVerified
        };
    }

    public async Task<Dictionary<string, string>> GetUserDisplayNamesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return new();

        var users = await _userManager.Users
            .Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync(cancellationToken);

        return users.ToDictionary(u => u.Id, u => u.FullName);
    }

    public async Task<Dictionary<string, (string Name, string Email)>> GetUserInfoAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return new();

        var users = await _userManager.Users
            .Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, Email = u.Email ?? "" })
            .ToListAsync(cancellationToken);

        return users.ToDictionary(u => u.Id, u => (u.FullName, u.Email));
    }

    public async Task<Result> UpdateSubscriptionAsync(string userId, SubscriptionTier tier, DateTime expiryDate, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return Result.Failure("User not found.");

        user.SubscriptionTier = tier;
        user.SubscriptionExpiryDate = expiryDate;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded
            ? Result.Success()
            : Result.Failure(result.Errors.Select(e => e.Description));
    }

    /// <summary>
    /// Generates a single-use reset token and emails the reset link.
    /// Always reports success so the response cannot be used to discover which
    /// email addresses have accounts.
    /// </summary>
    public async Task<bool> ForgotPasswordAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);

        // Inactive accounts (awaiting approval or disabled) must not be resettable.
        if (user is null || !user.IsActive || string.IsNullOrWhiteSpace(user.Email))
            return true;

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        // The raw token contains characters that do not survive a URL round-trip.
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var baseUrl = _emailSettings.AppBaseUrl.TrimEnd('/');
        var resetUrl =
            $"{baseUrl}/reset-password?email={UrlEncoder.Default.Encode(user.Email)}&token={encodedToken}";

        try
        {
            await _emailService.SendPasswordResetAsync(user.Email, resetUrl, cancellationToken);
        }
        catch (Exception ex)
        {
            // Swallow so the caller's response stays identical either way; the operator
            // still gets a logged error. The token itself is never logged.
            _logger.LogError(ex, "Failed to send password reset email to {Email}.", user.Email);
        }

        return true;
    }

    /// <summary>
    /// Completes a password reset. Returns a deliberately vague failure for bad or expired
    /// tokens so the endpoint cannot be used to probe for valid accounts.
    /// </summary>
    public async Task<Result> ResetPasswordAsync(
        string email, string token, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
            return Result.Failure("This password reset link is invalid or has expired.");

        string decodedToken;
        try
        {
            decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
        }
        catch (FormatException)
        {
            return Result.Failure("This password reset link is invalid or has expired.");
        }

        var result = await _userManager.ResetPasswordAsync(user, decodedToken, newPassword);
        if (!result.Succeeded)
        {
            // Password-policy failures are genuinely useful to the user; token failures are not.
            var passwordErrors = result.Errors
                .Where(e => !e.Code.Contains("Token", StringComparison.OrdinalIgnoreCase))
                .Select(e => e.Description)
                .ToArray();

            return passwordErrors.Length > 0
                ? Result.Failure(passwordErrors)
                : Result.Failure("This password reset link is invalid or has expired.");
        }

        // A reset invalidates existing sessions: drop the refresh token so old devices
        // cannot silently renew access with the previous credentials.
        user.RefreshToken = null;
        user.RefreshTokenExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        _logger.LogInformation("Password reset completed for {Email}.", email);
        return Result.Success();
    }
}
