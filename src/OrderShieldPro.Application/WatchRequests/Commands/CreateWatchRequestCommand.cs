using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.WatchRequests.Commands;

/// <summary>
/// Create a watch/investigation request when an entity is not found.
/// </summary>
public record CreateWatchRequestCommand : IRequest<Result<Guid>>
{
    public string EntityName { get; init; } = string.Empty;
    public string? EntityPhone { get; init; }
    public string? EntityWeChat { get; init; }
    public string? EntityWebsite { get; init; }
    public string? EntityCountry { get; init; }
    public string? AdditionalDetails { get; init; }

    /// <summary>Comma-separated checklist items the user wants to know about.</summary>
    public string? EnquiryChecklist { get; init; }
}
