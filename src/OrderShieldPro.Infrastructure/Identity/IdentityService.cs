using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;
using OrderShieldPro.Domain.Enums;

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

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtTokenService jwtTokenService,
        IApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtTokenService = jwtTokenService;
        _dbContext = dbContext;
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
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            return (false, null, null, null, result.Errors.Select(e => e.Description).ToArray());
        }

        // Generate tokens
        var accessToken = _jwtTokenService.GenerateAccessToken(
            user.Id, user.Email!, user.Role.ToString(), user.SubscriptionTier.ToString());
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        // Store refresh token
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7);
        await _userManager.UpdateAsync(user);

        return (true, user.Id, accessToken, refreshToken, Array.Empty<string>());
    }

    public async Task<(bool Succeeded, string? UserId, string? Token, string? RefreshToken, string? Language, string[] Errors)> LoginAsync(
        string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || !user.IsActive)
        {
            return (false, null, null, null, null, new[] { "Invalid email or password." });
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
    /// Generate a password reset token for the given email.
    /// In production this would send an email; for demo we just log and return success.
    /// Always returns success to avoid leaking whether an email exists.
    /// </summary>
    public async Task<bool> ForgotPasswordAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            // Don't reveal that the user doesn't exist — return true anyway
            return true;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        // In production: send reset email with token
        // For demo: just log it
        Console.WriteLine($"[DEMO] Password reset token for {email}: {token}");
        return true;
    }
}
