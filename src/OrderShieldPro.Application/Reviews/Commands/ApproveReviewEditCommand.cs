using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Admin approves a pending owner-submitted edit.
/// The pending edit snapshot is applied to the review and it stays Published.
/// </summary>
public record ApproveReviewEditCommand(Guid ReviewId) : IRequest<Result>;
