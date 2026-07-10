using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Edit an existing review owned by the current user.
/// Edited reviews are reset to Pending and must be re-validated by an admin
/// before they become publicly visible again.
/// </summary>
public record UpdateReviewCommand : IRequest<Result>
{
    public Guid ReviewId { get; init; }

    public SeverityLevel Severity { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Narrative { get; init; } = string.Empty;
    public string? Product { get; init; }
    public string? ProductCategory { get; init; }
    public DateTime? IncidentDate { get; init; }

    public string? ContactName { get; init; }
    public string? ContactPhoneUsed { get; init; }

    public bool IsComment { get; init; }
}
