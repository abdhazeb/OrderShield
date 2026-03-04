using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Users.Commands;

/// <summary>
/// Update the current user's language preference.
/// </summary>
public record UpdateLanguageCommand(Language Language) : IRequest<Result>;
