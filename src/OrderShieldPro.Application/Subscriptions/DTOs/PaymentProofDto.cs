namespace OrderShieldPro.Application.Subscriptions.DTOs;

/// <summary>
/// Location and metadata of a stored payment proof file, returned only to callers
/// that have passed the authorization check in GetPaymentProofQueryHandler.
/// </summary>
public record PaymentProofDto
{
    public string StoragePath { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
}
