namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Minimal HTML email shell. Inline styles only and a table-free layout, since most mail
/// clients strip stylesheets. Colours mirror the Suplyrate palette in styles.scss.
/// </summary>
internal static class EmailTemplates
{
    private const string Navy = "#0f1729";
    private const string Accent = "#0d7377";
    private const string TextSecondary = "#4a5468";

    public static string Wrap(string heading, string bodyHtml, string appBaseUrl, string? ctaLabel = null, string? ctaUrl = null)
    {
        var cta = ctaLabel is not null && !string.IsNullOrWhiteSpace(ctaUrl)
            ? $"""
               <p style="margin:28px 0;">
                 <a href="{ctaUrl}" style="background:{Accent};color:#ffffff;text-decoration:none;
                    padding:12px 22px;border-radius:6px;display:inline-block;font-weight:600;">{ctaLabel}</a>
               </p>
               <p style="font-size:12px;color:{TextSecondary};">
                 If the button does not work, copy this link into your browser:<br>{ctaUrl}
               </p>
               """
            : string.Empty;

        var footerLink = string.IsNullOrWhiteSpace(appBaseUrl)
            ? "Suplyrate"
            : $"""<a href="{appBaseUrl}" style="color:{TextSecondary};">Suplyrate</a>""";

        return $"""
                <div style="margin:0;padding:24px;background:#f8f9fb;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dfe2ea;border-radius:10px;overflow:hidden;">
                    <div style="background:{Navy};padding:20px 28px;">
                      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">Suplyrate</span>
                    </div>
                    <div style="padding:28px;color:{Navy};font-size:15px;line-height:1.6;">
                      <h1 style="margin:0 0 16px;font-size:20px;color:{Navy};">{heading}</h1>
                      {bodyHtml}
                      {cta}
                    </div>
                    <div style="padding:16px 28px;border-top:1px solid #eceef3;font-size:12px;color:{TextSecondary};">
                      Sent by {footerLink}. Please do not reply to this message.
                    </div>
                  </div>
                </div>
                """;
    }
}
