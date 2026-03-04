using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.Notifications.DTOs;

public record NotificationDto
{
    public Guid Id { get; init; }
    public NotificationType Type { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public Guid? ReferenceEntityId { get; init; }
    public Guid? ReferenceReviewId { get; init; }
    public bool IsRead { get; init; }
    public DateTime? ReadAt { get; init; }
    public DateTime CreatedAt { get; init; }
}
