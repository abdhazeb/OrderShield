using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Users.DTOs;

namespace OrderShieldPro.Application.Users.Queries;

/// <summary>
/// Get the current user's profile.
/// </summary>
public record GetUserProfileQuery : IRequest<Result<UserProfileDto>>;
