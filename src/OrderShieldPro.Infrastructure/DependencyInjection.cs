using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Identity;
using OrderShieldPro.Infrastructure.Persistence;
using OrderShieldPro.Infrastructure.Repositories;
using OrderShieldPro.Infrastructure.Services;

namespace OrderShieldPro.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Development-only signing key. Never used outside Development — see <see cref="ResolveJwtSecret"/>.
    /// </summary>
    private const string DevelopmentJwtSecret = "DEVELOPMENT-ONLY-key-not-valid-in-any-other-environment!!";

    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        bool isDevelopment = false)
    {
        // Database
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        // Identity
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 10;
            options.User.RequireUniqueEmail = true;

            // Account lockout settings
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // JWT Settings. The signing secret is never stored in appsettings.json — it is
        // supplied out-of-band (environment variable JwtSettings__Secret, user-secrets,
        // or appsettings.Production.json on the server, which is not committed).
        var jwtSettings = new JwtSettings();
        configuration.Bind(JwtSettings.SectionName, jwtSettings);
        jwtSettings.Secret = ResolveJwtSecret(jwtSettings.Secret, isDevelopment);

        services.Configure<JwtSettings>(options =>
        {
            configuration.Bind(JwtSettings.SectionName, options);
            options.Secret = jwtSettings.Secret;
        });

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                ClockSkew = TimeSpan.Zero
            };
        });

        // Repositories
        services.AddScoped<ITradeEntityRepository, TradeEntityRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Services
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IdentityService>();
        services.AddScoped<IIdentityService>(provider => provider.GetRequiredService<IdentityService>());
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IFileStorageService, FileStorageService>();
        services.AddScoped<IEntityImportService, EntityImportService>();

        // Email: real SMTP whenever it is configured. Development may fall back to a
        // logging stub; any other environment keeps SmtpEmailService so that a missing
        // configuration surfaces as a logged error instead of silently dropping mail.
        var emailSettings = new EmailSettings();
        configuration.Bind(EmailSettings.SectionName, emailSettings);
        services.Configure<EmailSettings>(configuration.GetSection(EmailSettings.SectionName));

        if (!emailSettings.IsConfigured && isDevelopment)
        {
            services.AddScoped<IEmailService, LoggingEmailService>();
        }
        else
        {
            services.AddScoped<IEmailService, SmtpEmailService>();
        }
        services.AddScoped<INotificationService, NotificationService>();

        services.AddHttpContextAccessor();

        return services;
    }

    /// <summary>
    /// Returns the JWT signing secret, failing fast when a usable one is not configured.
    /// Outside Development a missing or too-short secret is a hard startup error: silently
    /// falling back to a well-known key would let anyone forge tokens for any role.
    /// </summary>
    private static string ResolveJwtSecret(string? configured, bool isDevelopment)
    {
        // HMAC-SHA256 needs a 256-bit key; anything shorter weakens every token we issue.
        const int minimumSecretLength = 32;

        if (!string.IsNullOrWhiteSpace(configured) && configured.Length >= minimumSecretLength)
            return configured;

        if (isDevelopment)
            return DevelopmentJwtSecret;

        var problem = string.IsNullOrWhiteSpace(configured)
            ? "was not configured"
            : $"is only {configured.Length} characters";

        throw new InvalidOperationException(
            $"JwtSettings:Secret {problem}. It must be at least {minimumSecretLength} characters and " +
            "must be supplied outside source control — set the JwtSettings__Secret environment variable " +
            "on the app pool, or add it to appsettings.Production.json on the server.");
    }
}
