namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// Email service abstraction for sending notifications and verification emails.
/// </summary>
public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default);

    Task SendReviewStatusNotificationAsync(string to, string reviewTitle, string newStatus, CancellationToken cancellationToken = default);

    Task SendInvestigationCompleteNotificationAsync(string to, string entityName, CancellationToken cancellationToken = default);
}
