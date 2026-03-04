using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.WatchRequests.DTOs;

public record WatchRequestDto
{
    public Guid Id { get; init; }
    public string RequestedById { get; init; } = string.Empty;
    public string EntityName { get; init; } = string.Empty;
    public string? EntityPhone { get; init; }
    public string? EntityWeChat { get; init; }
    public string? EntityWebsite { get; init; }
    public string? EntityCountry { get; init; }
    public string? AdditionalDetails { get; init; }
    public string? EnquiryChecklist { get; init; }
    public InvestigationStatus Status { get; init; }
    public string? ServiceTeamNotes { get; init; }
    public string? ReplyMessage { get; init; }
    public DateTime? RepliedAt { get; init; }
    public Guid? ResultEntityId { get; init; }
    public DateTime? ResolvedDate { get; init; }
    public DateTime CreatedAt { get; init; }
    public int SubscriberCount { get; init; }
}
