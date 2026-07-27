using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OrderShieldPro.Application.Common.Interfaces;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Sends mail over SMTP. Uses System.Net.Mail so no additional dependency is required;
/// if the provider needs modern auth (OAuth2), swap this for a MailKit-based implementation
/// — the interface and templates stay the same.
///
/// Send failures are logged and swallowed rather than thrown: a bounced notification must
/// not roll back the review or subscription action that triggered it. Password reset is the
/// one place a failure is surfaced to the caller.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> settings, ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default) =>
        SendAsync(to, subject, htmlBody, throwOnFailure: false, cancellationToken);

    public Task SendReviewStatusNotificationAsync(string to, string reviewTitle, string newStatus, CancellationToken cancellationToken = default)
    {
        var body = EmailTemplates.Wrap(
            "Your review status changed",
            $"""
             <p>Your review <strong>{WebUtility.HtmlEncode(reviewTitle)}</strong> is now
             <strong>{WebUtility.HtmlEncode(newStatus)}</strong>.</p>
             <p>You can see the full history of your submissions in your Suplyrate profile.</p>
             """,
            _settings.AppBaseUrl,
            "View my reviews",
            string.IsNullOrWhiteSpace(_settings.AppBaseUrl) ? null : $"{_settings.AppBaseUrl}/profile");

        return SendAsync(to, $"Review update: {reviewTitle}", body, throwOnFailure: false, cancellationToken);
    }

    public Task SendInvestigationCompleteNotificationAsync(string to, string entityName, CancellationToken cancellationToken = default)
    {
        var body = EmailTemplates.Wrap(
            "Investigation complete",
            $"""
             <p>We finished investigating <strong>{WebUtility.HtmlEncode(entityName)}</strong>
             and the profile is now available on Suplyrate.</p>
             """,
            _settings.AppBaseUrl,
            "Search Suplyrate",
            string.IsNullOrWhiteSpace(_settings.AppBaseUrl) ? null : $"{_settings.AppBaseUrl}/search");

        return SendAsync(to, $"Investigation complete: {entityName}", body, throwOnFailure: false, cancellationToken);
    }

    public Task SendPasswordResetAsync(string to, string resetUrl, CancellationToken cancellationToken = default)
    {
        var body = EmailTemplates.Wrap(
            "Reset your password",
            """
            <p>We received a request to reset your Suplyrate password. This link is valid for a
            limited time and can only be used once.</p>
            <p>If you did not request a reset, you can ignore this email — your password will
            not change.</p>
            """,
            _settings.AppBaseUrl,
            "Reset my password",
            resetUrl);

        // Reset is the one flow where the user is blocked if delivery fails, so let it throw.
        return SendAsync(to, "Reset your Suplyrate password", body, throwOnFailure: true, cancellationToken);
    }

    private async Task SendAsync(string to, string subject, string htmlBody, bool throwOnFailure, CancellationToken cancellationToken)
    {
        if (!_settings.IsConfigured)
        {
            _logger.LogError(
                "Email to {To} ('{Subject}') was not sent: EmailSettings:Host / FromAddress are not configured.",
                to, subject);

            if (throwOnFailure)
                throw new InvalidOperationException("Email delivery is not configured.");

            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromAddress, _settings.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(to);

        using var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = _settings.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(_settings.UserName))
        {
            client.Credentials = new NetworkCredential(_settings.UserName, _settings.Password);
        }

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            // Never log the body — reset emails contain a single-use token.
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", to, subject);

            if (throwOnFailure)
                throw;
        }
    }
}
