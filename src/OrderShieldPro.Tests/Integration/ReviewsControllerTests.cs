using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Integration;

public class ReviewsControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public ReviewsControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetByEntity_ReturnsOk()
    {
        // Arrange
        var entityId = await SeedEntityAsync("Reviews Test Entity");

        // Act
        var response = await _client.GetAsync($"/api/reviews?entityId={entityId}&page=1&pageSize=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        var request = new
        {
            TradeEntityId = Guid.NewGuid(),
            ReviewerType = 0,
            TransactionRole = "Test",
            Severity = 1,
            Title = "Test Review",
            Narrative = new string('A', 150),
            IncidentDate = DateTime.UtcNow.AddDays(-5),
            VerificationEmail = "test@test.com"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/reviews", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_WithAuth_AndValidData_ReturnsOkOrCreated()
    {
        // Arrange — register and login
        var token = await RegisterAndLoginAsync();
        var entityId = await SeedEntityAsync("Review Target Entity");

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new
        {
            TradeEntityId = entityId,
            ReviewerType = 0,
            TransactionRole = "Broker reviewing Supplier",
            Severity = 1,
            Title = "Integration Test Review",
            Narrative = "This is a detailed narrative for the integration test review that exceeds the minimum character count required for the review submission to pass validation rules.",
            Product = "Test Product",
            ProductCategory = "Metals",
            IncidentDate = DateTime.UtcNow.AddDays(-5),
            OrderValue = 25000,
            VerificationEmail = "test@example.com"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/reviews", request);

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task GetMyReviews_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/reviews/my?page=1&pageSize=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<Guid> SeedEntityAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var entity = new TradeEntity
        {
            LegalName = name,
            EntityType = EntityType.Supplier,
            Country = "China",
            City = "Shenzhen",
            ListedDate = DateTime.UtcNow
        };

        db.TradeEntities.Add(entity);
        await db.SaveChangesAsync();
        return entity.Id;
    }

    private async Task<string> RegisterAndLoginAsync()
    {
        var email = $"reviewer_{Guid.NewGuid():N}@example.com";
        var password = "Test@12345";

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = password,
            FullName = "Test Reviewer",
            Role = 0, // UserRole.Broker
            Language = 0
        });

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = email,
            Password = password
        });

        var content = await loginResponse.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(content);

        // Try to find the token in the response
        if (doc.RootElement.TryGetProperty("token", out var tokenElement))
            return tokenElement.GetString() ?? string.Empty;

        if (doc.RootElement.TryGetProperty("accessToken", out var tokenElement2))
            return tokenElement2.GetString() ?? string.Empty;

        if (doc.RootElement.TryGetProperty("AccessToken", out var tokenElement3))
            return tokenElement3.GetString() ?? string.Empty;

        return string.Empty;
    }
}
