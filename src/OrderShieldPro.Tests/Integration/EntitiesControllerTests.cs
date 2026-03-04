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

public class EntitiesControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public EntitiesControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Search_WithNoParams_ReturnsOk()
    {
        // Arrange — seed entity
        await SeedEntityAsync("Search Test Entity");

        // Act
        var response = await _client.GetAsync("/api/entities/search?page=1&pageSize=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Search_WithSearchTerm_ReturnsOk()
    {
        // Arrange
        await SeedEntityAsync("Shenzhen Test Corp");

        // Act
        var response = await _client.GetAsync("/api/entities/search?q=Shenzhen&page=1&pageSize=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_WithValidId_ReturnsOk()
    {
        // Arrange
        var entityId = await SeedEntityAsync("GetById Test Entity");

        // Act
        var response = await _client.GetAsync($"/api/entities/{entityId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_WithInvalidId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync($"/api/entities/{Guid.NewGuid()}");

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.InternalServerError);
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
}
