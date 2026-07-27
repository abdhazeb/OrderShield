using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderShieldPro.Application.EvidenceNotes.Commands;
using OrderShieldPro.Application.EvidenceNotes.Queries;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("GeneralPolicy")]
[Authorize(Roles = "ServiceTeam,Admin,SuperAdmin")]
public class EvidenceNotesController : ControllerBase
{
    private readonly IMediator _mediator;

    public EvidenceNotesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Add a clarification/evidence note to a review.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEvidenceNoteCommand command, CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetByReview), new { reviewId = command.ReviewId }, new { id = result.Data })
            : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Get all evidence notes for a review.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetByReview([FromQuery] Guid reviewId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetEvidenceNotesByReviewQuery(reviewId), ct);
        return Ok(result);
    }
}
