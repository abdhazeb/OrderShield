using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Enums;

namespace OrderShieldPro.Application.WatchRequests.Commands;

/// <summary>
/// Resolve a watch request (service team action).
/// </summary>
public record ResolveWatchRequestCommand : IRequest<Result>
{
    public Guid Id { get; init; }
    public InvestigationStatus NewStatus { get; init; }
    public string? ServiceTeamNotes { get; init; }
    public Guid? ResultEntityId { get; init; }
}
