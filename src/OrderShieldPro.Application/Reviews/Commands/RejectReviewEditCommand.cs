using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Admin rejects a pending owner-submitted edit.
/// The pending edit snapshot is discarded and the review is restored to Published
/// with its original content intact.
/// </summary>
public record RejectReviewEditCommand(Guid ReviewId) : IRequest<Result>;
