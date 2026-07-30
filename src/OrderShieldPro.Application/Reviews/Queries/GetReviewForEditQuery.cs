using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// The current values of a review, for prefilling the edit form. Available to the review's
/// owner and to moderators.
///
/// The edit form must load from here rather than from whatever the calling page happened to
/// have in memory: the list DTOs deliberately omit the contact fields, so a form primed from
/// a list would submit them blank and silently erase them.
/// </summary>
public record GetReviewForEditQuery(Guid ReviewId) : IRequest<Result<ReviewEditDto>>;
