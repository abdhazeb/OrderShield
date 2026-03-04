namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// JWT token generation and validation service.
/// </summary>
public interface IJwtTokenService
{
    string GenerateAccessToken(string userId, string email, string role, string subscriptionTier);
    string GenerateRefreshToken();
    (string UserId, string Email)? ValidateRefreshToken(string refreshToken);
    Task StoreRefreshTokenAsync(string userId, string refreshToken, DateTime expiresAt, CancellationToken cancellationToken = default);
    Task<bool> ValidateAndRevokeRefreshTokenAsync(string userId, string refreshToken, CancellationToken cancellationToken = default);
}
