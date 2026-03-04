using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderShieldPro.Application.Subscriptions.Commands;
using OrderShieldPro.Application.Subscriptions.Queries;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SubscriptionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get all available subscription plans (public).
    /// </summary>
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPlansQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Get the current user's subscription.
    /// </summary>
    [HttpGet("current")]
    [Authorize]
    public async Task<IActionResult> GetCurrentPlan(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetCurrentPlanQuery(), ct);
        return result.Succeeded ? Ok(result.Data) : BadRequest(new { result.Errors });
    }

    /// <summary>
    /// Change subscription plan.
    /// </summary>
    [HttpPost("change")]
    [Authorize]
    public async Task<IActionResult> ChangePlan([FromBody] ChangePlanRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new ChangePlanCommand(request.NewTier), ct);
        return result.Succeeded ? Ok() : BadRequest(new { result.Errors });
    }

    public record ChangePlanRequest(SubscriptionTier NewTier);
}
