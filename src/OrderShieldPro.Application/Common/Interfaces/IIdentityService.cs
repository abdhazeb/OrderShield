using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;

namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Identity operations contract — implementation lives in Infrastructure
/// since it requires Identity's UserManager.
/// </summary>
public interface IIdentityService
{
    Task<Result> UpdateProfileAsync(string userId, string fullName, string? region, CancellationToken cancellationToken = default);
    Task<Result> UpdateLanguageAsync(string userId, string language, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> GetUserProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, string>> GetUserDisplayNamesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);
}
