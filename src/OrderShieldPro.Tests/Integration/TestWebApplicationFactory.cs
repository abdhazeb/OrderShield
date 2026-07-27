using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrderShieldPro.Infrastructure.Identity;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Integration;

/// <summary>
/// Custom WebApplicationFactory that replaces SQL Server with InMemory database for testing.
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = "TestDb_" + Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // The production auth limit (10/min) is far below what a test class issues, so raise
        // it here. Rate limiting itself is exercised by its own dedicated test.
        builder.UseSetting("RateLimiting:AuthPermitLimit", "10000");
        builder.UseSetting("RateLimiting:GeneralPermitLimit", "10000");

        builder.ConfigureServices(services =>
        {
            // Remove the existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Remove the existing ApplicationDbContext registration
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ApplicationDbContext));
            if (dbContextDescriptor != null)
                services.Remove(dbContextDescriptor);

            // Also remove IApplicationDbContext if registered
            var idbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(OrderShieldPro.Application.Common.Interfaces.IApplicationDbContext));
            if (idbContextDescriptor != null)
                services.Remove(idbContextDescriptor);

            var dbName = _dbName;

            // Add InMemory database
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase(dbName);
            });

            // Re-register IApplicationDbContext pointing to the same InMemory instance
            services.AddScoped<OrderShieldPro.Application.Common.Interfaces.IApplicationDbContext>(
                sp => sp.GetRequiredService<ApplicationDbContext>());

            // Build service provider and seed the database
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Database.EnsureCreated();
        });

        builder.UseEnvironment("Development");
    }

    /// <summary>
    /// Approves a freshly registered account. Public registration creates users in an
    /// inactive, awaiting-approval state, so tests that need to sign in must approve the
    /// account first — exactly as a SuperAdmin would.
    /// </summary>
    public async Task ApproveUserAsync(string email)
    {
        using var scope = Services.CreateScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
            throw new InvalidOperationException($"No account was registered for {email}.");

        // Mirror what the real approval endpoint records — an account that is active but has
        // no ApprovedAt still reads as a pending registration everywhere else.
        user.IsActive = true;
        user.ApprovedAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);
    }
}
