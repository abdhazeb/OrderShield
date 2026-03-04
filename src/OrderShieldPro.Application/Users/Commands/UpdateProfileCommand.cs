using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Users.Commands;

/// <summary>
/// Update the current user's profile information.
/// </summary>
public record UpdateProfileCommand : IRequest<Result>
{
    public string FullName { get; init; } = string.Empty;
    public string? Region { get; init; }
}
