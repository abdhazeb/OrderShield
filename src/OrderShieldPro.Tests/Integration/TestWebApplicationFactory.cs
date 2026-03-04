using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
}
