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

    /// <summary>
    /// Uploading evidence used to write the bytes to disk and return the path without ever
    /// creating a ReviewEvidenceFile row, so moderators saw no attachments on submissions
    /// that had them. The rows are what the moderation screens read — assert on those.
    /// </summary>
    [Fact]
    public async Task UploadEvidence_PersistsTheFilesAgainstTheReview()
    {
        // Arrange
        var token = await RegisterAndLoginAsync();
        var entityId = await SeedEntityAsync("Evidence Target Entity");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var reviewId = await CreateReviewAsync(entityId);

        using var form = new MultipartFormDataContent();
        form.Add(ImageContent("proof-one.png"), "files", "proof-one.png");
        form.Add(PdfContent("invoice.pdf"), "files", "invoice.pdf");

        // Act
        var response = await _client.PostAsync($"/api/reviews/{reviewId}/evidence", form);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = db.ReviewEvidenceFiles.Where(f => f.ReviewId == reviewId).ToList();

        stored.Should().HaveCount(2);
        stored.Select(f => f.FileName).Should().BeEquivalentTo(new[] { "proof-one.png", "invoice.pdf" });
        stored.Should().OnlyContain(f => f.StoragePath.Length > 0 && f.FileSizeBytes > 0);
    }

    [Fact]
    public async Task UploadEvidence_ByADifferentUser_IsRefused()
    {
        // Arrange — one user files the review, another tries to attach to it.
        var ownerToken = await RegisterAndLoginAsync();
        var entityId = await SeedEntityAsync("Evidence Authorization Entity");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var reviewId = await CreateReviewAsync(entityId);

        var intruderToken = await RegisterAndLoginAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", intruderToken);

        using var form = new MultipartFormDataContent();
        form.Add(ImageContent("not-mine.png"), "files", "not-mine.png");

        // Act
        var response = await _client.PostAsync($"/api/reviews/{reviewId}/evidence", form);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.ReviewEvidenceFiles.Count(f => f.ReviewId == reviewId).Should().Be(0);
    }

    [Fact]
    public async Task GetForModeration_AsTheReviewer_IsRefused()
    {
        // Arrange — the dossier carries contact details, so it is moderator-only.
        var token = await RegisterAndLoginAsync();
        var entityId = await SeedEntityAsync("Moderation Detail Entity");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var reviewId = await CreateReviewAsync(entityId);

        // Act
        var response = await _client.GetAsync($"/api/reviews/{reviewId}/moderation");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    /// <summary>Creates a review as the currently authenticated caller and returns its id.</summary>
    private async Task<Guid> CreateReviewAsync(Guid entityId)
    {
        var response = await _client.PostAsJsonAsync("/api/reviews", new
        {
            TradeEntityId = entityId,
            ReviewerType = 0,
            TransactionRole = "Broker reviewing Supplier",
            Severity = 1,
            Title = "Evidence Test Review",
            Narrative = "A narrative long enough to satisfy the validator for this submission, describing the incident in enough detail to be assessed.",
            ProductCategory = "Metals",
            ContactName = "Mr Chen",
            ContactPosition = "Purchasing Manager",
            IncidentDate = DateTime.UtcNow.AddDays(-5),
            VerificationEmail = "test@example.com"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
        var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("id").GetGuid();
    }

    private static ByteArrayContent ImageContent(string fileName)
    {
        // Minimal PNG header — enough for the extension/content-type whitelist.
        var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01 };
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        return content;
    }

    private static ByteArrayContent PdfContent(string fileName)
    {
        var bytes = System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n% test fixture\n");
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return content;
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

        // Registration leaves the account awaiting SuperAdmin approval; approve it so the
        // account can sign in.
        await _factory.ApproveUserAsync(email);

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
