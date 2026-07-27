using Microsoft.Extensions.Logging;
using OrderShieldPro.Application.Common.Interfaces;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Development fallback used only when SMTP is not configured. Logs what would have been
/// sent so local flows remain testable. Registered only in Development — see
/// DependencyInjection.AddInfrastructure.
/// </summary>
public class LoggingEmailService : IEmailService
{
    private readonly ILogger<LoggingEmailService> _logger;

    public LoggingEmailService(ILogger<LoggingEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[DEV EMAIL] To {To}: {Subject}", to, subject);
        return Task.CompletedTask;
    }

    public Task SendReviewStatusNotificationAsync(string to, string reviewTitle, string newStatus, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "[DEV EMAIL] Review status to {To}: '{Title}' is now {Status}",
            to, reviewTitle, newStatus);
        return Task.CompletedTask;
    }

    public Task SendInvestigationCompleteNotificationAsync(string to, string entityName, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "[DEV EMAIL] Investigation complete to {To}: entity '{EntityName}'",
            to, entityName);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(string to, string resetUrl, CancellationToken cancellationToken = default)
    {
        // Printed in full so a developer can complete the reset flow locally. This is why
        // the service is confined to Development.
        _logger.LogWarning("[DEV EMAIL] Password reset link for {To}: {ResetUrl}", to, resetUrl);
        return Task.CompletedTask;
    }
}
