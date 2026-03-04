using Microsoft.Extensions.Logging;
using OrderShieldPro.Application.Common.Interfaces;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Placeholder email service for development.
/// Logs emails instead of sending them. Replace with SMTP/SendGrid in production.
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("📧 Email sent to {To}: {Subject}", to, subject);
        _logger.LogDebug("Email body: {Body}", htmlBody);
        return Task.CompletedTask;
    }

    public Task SendReviewStatusNotificationAsync(string to, string reviewTitle, string newStatus, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "📧 Review status notification to {To}: '{Title}' is now {Status}",
            to, reviewTitle, newStatus);
        return Task.CompletedTask;
    }

    public Task SendInvestigationCompleteNotificationAsync(string to, string entityName, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "📧 Investigation complete notification to {To}: Entity '{EntityName}' has been investigated",
            to, entityName);
        return Task.CompletedTask;
    }
}
