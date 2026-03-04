using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Users.Commands;

/// <summary>
/// Follow (add to watchlist) a trade entity.
/// </summary>
public record FollowEntityCommand(Guid TradeEntityId) : IRequest<Result>;
