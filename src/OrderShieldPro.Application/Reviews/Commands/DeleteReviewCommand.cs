using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Delete a review owned by the current user.
/// Deletion is immediate and does not require admin validation.
/// </summary>
public record DeleteReviewCommand(Guid ReviewId) : IRequest<Result>;
