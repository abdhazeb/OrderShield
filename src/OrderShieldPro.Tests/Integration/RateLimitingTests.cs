using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Integration;

/// <summary>
/// Login is the endpoint an attacker hammers, so the strict auth limiter has to actually
/// reject once the window is exhausted. Uses a deliberately tiny limit rather than issuing
/// the production allowance of requests.
/// </summary>
public class RateLimitingTests : IClassFixture<RateLimitedWebApplicationFactory>
{
    private readonly RateLimitedWebApplicationFactory _factory;

    public RateLimitingTests(RateLimitedWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_BeyondTheAuthLimit_IsRejectedWith429()
    {
        var client = _factory.CreateClient();
        var credentials = new { Email = "nobody@example.com", Password = "Wrong@12345" };

        var statuses = new List<HttpStatusCode>();
        for (var attempt = 0; attempt < RateLimitedWebApplicationFactory.AuthPermitLimit + 2; attempt++)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", credentials);
            statuses.Add(response.StatusCode);
        }

        // The early attempts are rejected on credentials, the later ones by the limiter.
        statuses.Should().Contain(HttpStatusCode.TooManyRequests);
        statuses.Take(RateLimitedWebApplicationFactory.AuthPermitLimit)
            .Should().NotContain(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task HealthProbe_IsNeverRateLimited()
    {
        var client = _factory.CreateClient();

        // Monitoring polls continuously; the probe must stay available regardless.
        for (var attempt = 0; attempt < RateLimitedWebApplicationFactory.AuthPermitLimit + 5; attempt++)
        {
            var response = await client.GetAsync("/health");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}

/// <summary>
/// Host configured with a very small auth rate limit so the limiter can be observed
/// rejecting requests without issuing hundreds of calls.
/// </summary>
public class RateLimitedWebApplicationFactory : WebApplicationFactory<Program>
{
    public const int AuthPermitLimit = 3;

    private readonly string _dbName = "RateLimitTestDb_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("RateLimiting:AuthPermitLimit", AuthPermitLimit.ToString());

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ApplicationDbContext));
            if (dbContextDescriptor != null)
                services.Remove(dbContextDescriptor);

            var idbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(OrderShieldPro.Application.Common.Interfaces.IApplicationDbContext));
            if (idbContextDescriptor != null)
                services.Remove(idbContextDescriptor);

            var dbName = _dbName;
            services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase(dbName));
            services.AddScoped<OrderShieldPro.Application.Common.Interfaces.IApplicationDbContext>(
                sp => sp.GetRequiredService<ApplicationDbContext>());
        });

        builder.UseEnvironment("Development");
    }
}
