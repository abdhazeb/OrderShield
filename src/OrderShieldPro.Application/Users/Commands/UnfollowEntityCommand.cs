using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Users.Commands;

/// <summary>
/// Unfollow (remove from watchlist) a trade entity.
/// </summary>
public record UnfollowEntityCommand(Guid TradeEntityId) : IRequest<Result>;
