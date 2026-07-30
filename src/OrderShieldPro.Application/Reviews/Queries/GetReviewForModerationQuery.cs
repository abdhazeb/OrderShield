using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// Full detail of one review for the moderator dossier screen. Moderator-only —
/// the response carries reviewer contact details that are not public.
/// </summary>
public record GetReviewForModerationQuery(Guid ReviewId) : IRequest<Result<ReviewModerationDto>>;
