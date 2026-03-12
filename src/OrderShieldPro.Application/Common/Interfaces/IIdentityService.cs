using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;

namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Identity operations contract — implementation lives in Infrastructure
/// since it requires Identity's UserManager.
/// </summary>
public interface IIdentityService
{
    Task<Result> UpdateProfileAsync(string userId, string fullName, string? region, string? businessName = null, string? licenseAddress = null, string? businessPhone = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateLanguageAsync(string userId, string language, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> GetUserProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, string>> GetUserDisplayNamesAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);
    Task<Dictionary<string, (string Name, string Email)>> GetUserInfoAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);
    Task<Result> UpdateSubscriptionAsync(string userId, Domain.Enums.SubscriptionTier tier, DateTime expiryDate, CancellationToken cancellationToken = default);
}
