using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.DTOs;

/// <summary>
/// Serialised as JSON into Review.PendingEditJson when a published review
/// owner submits an edit that needs admin approval.
/// </summary>
public class ReviewPendingEdit
{
    public SeverityLevel Severity { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Narrative { get; set; } = string.Empty;
    public string? Product { get; set; }
    public string? ProductCategory { get; set; }
    public DateTime? IncidentDate { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPosition { get; set; }
    public string? ContactPhoneUsed { get; set; }
    public bool IsComment { get; set; }
}
