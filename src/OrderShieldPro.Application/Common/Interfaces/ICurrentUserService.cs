namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Service to access the current authenticated user's information.
/// </summary>
public interface ICurrentUserService
{
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}
