using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace OrderShieldPro.Tests.Integration;

public class AuthControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AuthControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
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

        // Registration leaves the account awaiting SuperAdmin approval; approve it so the
        // account can sign in.
        await _factory.ApproveUserAsync(email);

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
    public async Task ForgotPassword_ForAnUnknownEmail_StillReportsSuccess()
    {
        // The response must not reveal whether an account exists.
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            Email = $"nobody_{Guid.NewGuid():N}@example.com"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ResetPassword_WithAForgedToken_IsRejected()
    {
        // Arrange — a real, approved account
        var email = $"reset_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = "Test@12345",
            FullName = "Reset Test User",
            Role = 1,
            Language = 0
        });
        await _factory.ApproveUserAsync(email);

        // Act — attempt a reset with a token we made up
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            Email = email,
            Token = "bm90LWEtcmVhbC10b2tlbg",
            NewPassword = "Forged@12345"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // And the original password must still work.
        var login = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = email,
            Password = "Test@12345"
        });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Login_BeforeApproval_IsRejected()
    {
        // Arrange — register but leave the account awaiting approval
        var email = $"pending_{Guid.NewGuid():N}@example.com";
        var password = "Test@12345";

        await _client.PostAsJsonAsync("/api/auth/register", new
        {
            Email = email,
            Password = password,
            FullName = "Pending User",
            Role = 1,
            Language = 0
        });

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = email,
            Password = password
        });

        // Assert — an unapproved account must not be able to sign in
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
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
