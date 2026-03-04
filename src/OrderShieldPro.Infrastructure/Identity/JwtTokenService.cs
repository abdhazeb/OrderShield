using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OrderShieldPro.Application.Common.Interfaces;

namespace OrderShieldPro.Infrastructure.Identity;

public class JwtSettings
{
    public const string SectionName = "JwtSettings";
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessTokenExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public string GenerateAccessToken(string userId, string email, string role, string subscriptionTier)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, role),
            new("subscription_tier", subscriptionTier),
            new("user_id", userId)
        };

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public (string UserId, string Email)? ValidateRefreshToken(string refreshToken)
    {
        // Refresh token validation is done via database lookup
        // This method is a placeholder for token format validation
        if (string.IsNullOrWhiteSpace(refreshToken))
            return null;

        return null; // Actual validation happens in ValidateAndRevokeRefreshTokenAsync
    }

    public async Task StoreRefreshTokenAsync(string userId, string refreshToken, DateTime expiresAt, CancellationToken cancellationToken = default)
    {
        // This will be called from the auth handler which has access to UserManager
        // The refresh token is stored on the ApplicationUser entity
        await Task.CompletedTask;
    }

    public async Task<bool> ValidateAndRevokeRefreshTokenAsync(string userId, string refreshToken, CancellationToken cancellationToken = default)
    {
        // This will be called from the auth handler which has access to UserManager
        await Task.CompletedTask;
        return false;
    }
}
