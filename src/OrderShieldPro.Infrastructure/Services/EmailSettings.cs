namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// SMTP configuration. Supplied per-environment; the password must come from an
/// environment variable (EmailSettings__Password) or server-side config, never from
/// a committed appsettings file.
/// </summary>
public class EmailSettings
{
    public const string SectionName = "EmailSettings";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Suplyrate";

    /// <summary>
    /// Public base URL of the web app, used to build links in emails (no trailing slash).
    /// </summary>
    public string AppBaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// True when enough is configured to actually send mail.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(FromAddress);
}
