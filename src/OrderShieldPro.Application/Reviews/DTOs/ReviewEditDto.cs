using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Reviews.DTOs;

/// <summary>
/// Exactly the fields the submit/edit form writes, so an edit round-trips without
/// dropping anything. No reviewer identity or verification email — the owner's form
/// has no use for them.
/// </summary>
public record ReviewEditDto
{
    public Guid Id { get; init; }
    public Guid TradeEntityId { get; init; }
    public string TradeEntityName { get; init; } = string.Empty;
    public ReviewStatus Status { get; init; }
    public SeverityLevel Severity { get; init; }
    public bool IsComment { get; init; }

    public string Title { get; init; } = string.Empty;
    public string Narrative { get; init; } = string.Empty;
    public string? Product { get; init; }
    public string? ProductCategory { get; init; }
    public DateTime? IncidentDate { get; init; }

    public string? ContactName { get; init; }
    public string? ContactPosition { get; init; }
    public string? ContactPhoneUsed { get; init; }
}
