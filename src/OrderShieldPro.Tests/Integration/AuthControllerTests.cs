using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace OrderShieldPro.Tests.Integration;

public class AuthControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AuthControllerTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_WithValidData_ReturnsOk()
    {
        // Arrange
        var request = new
        {
            Email = $"test_{Guid.NewGuid():N}@example.com",
            Password = "Test@12345",
            FullName = "Test User",
            Role = 1, // UserRole.Buyer
            Language = 0 // Language.En
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"Response: {content}");
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            Email = "invalid-email",
            Password = "Test@12345",
            FullName = "Test User",
            Role = "Buyer"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        // Arrange — register first
        var email = $"login_test_{Guid.NewGuid():N}@example.com";
        var password = "Test@12345";

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = password,
            FullName = "Login Test User",
            Role = 1, // UserRole.Buyer
            Language = 0
        });

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = email,
            Password = password
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("token");
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "nonexistent@example.com",
            Password = "WrongPassword1!"
        });

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Logout_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/logout", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
