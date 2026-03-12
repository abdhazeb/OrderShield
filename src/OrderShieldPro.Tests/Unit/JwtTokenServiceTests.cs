using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Options;
using OrderShieldPro.Infrastructure.Identity;

namespace OrderShieldPro.Tests.Unit;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _service;
    private readonly JwtSettings _settings;

    public JwtTokenServiceTests()
    {
        _settings = new JwtSettings
        {
            Secret = "ThisIsAVeryLongSecretKeyForTestingPurposes1234567890!",
            Issuer = "OrderShieldPro",
            Audience = "OrderShieldProClient",
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7
        };

        _service = new JwtTokenService(Options.Create(_settings));
    }

    [Fact]
    public void GenerateAccessToken_ReturnsValidJwtToken()
    {
        // Act
        var token = _service.GenerateAccessToken("user-123", "test@test.com", "Buyer", "Free");

        // Assert
        token.Should().NotBeNullOrEmpty();
        var handler = new JwtSecurityTokenHandler();
        handler.CanReadToken(token).Should().BeTrue();
    }

    [Fact]
    public void GenerateAccessToken_ContainsCorrectClaims()
    {
        // Act
        var token = _service.GenerateAccessToken("user-123", "test@test.com", "Broker", "Pro");
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        // Assert
        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == "user-123");
        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "test@test.com");
        jwtToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == "Broker");
        jwtToken.Claims.Should().Contain(c => c.Type == "subscription_tier" && c.Value == "Pro");
        jwtToken.Claims.Should().Contain(c => c.Type == "user_id" && c.Value == "user-123");
    }

    [Fact]
    public void GenerateAccessToken_SetsCorrectIssuerAndAudience()
    {
        // Act
        var token = _service.GenerateAccessToken("user-123", "test@test.com", "Buyer", "Free");
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        // Assert
        jwtToken.Issuer.Should().Be("OrderShieldPro");
        jwtToken.Audiences.Should().Contain("OrderShieldProClient");
    }

    [Fact]
    public void GenerateAccessToken_SetsCorrectExpiration()
    {
        // Act
        var beforeGeneration = DateTime.UtcNow;
        var token = _service.GenerateAccessToken("user-123", "test@test.com", "Buyer", "Free");
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        // Assert
        jwtToken.ValidTo.Should().BeAfter(beforeGeneration.AddMinutes(59));
        jwtToken.ValidTo.Should().BeBefore(DateTime.UtcNow.AddMinutes(61));
    }

    [Fact]
    public void GenerateAccessToken_EachTokenHasUniqueJti()
    {
        // Act
        var token1 = _service.GenerateAccessToken("user-123", "test@test.com", "Buyer", "Free");
        var token2 = _service.GenerateAccessToken("user-123", "test@test.com", "Buyer", "Free");

        var handler = new JwtSecurityTokenHandler();
        var jti1 = handler.ReadJwtToken(token1).Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value;
        var jti2 = handler.ReadJwtToken(token2).Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value;

        // Assert
        jti1.Should().NotBe(jti2);
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsNonEmptyString()
    {
        // Act
        var refreshToken = _service.GenerateRefreshToken();

        // Assert
        refreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsUniqueTokens()
    {
        // Act
        var token1 = _service.GenerateRefreshToken();
        var token2 = _service.GenerateRefreshToken();

        // Assert
        token1.Should().NotBe(token2);
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsBase64String()
    {
        // Act
        var refreshToken = _service.GenerateRefreshToken();

        // Assert — should be valid Base64
        var act = () => Convert.FromBase64String(refreshToken);
        act.Should().NotThrow();
        Convert.FromBase64String(refreshToken).Should().HaveCount(64);
    }

    [Fact]
    public void ValidateRefreshToken_WithEmptyToken_ReturnsNull()
    {
        // Act
        var result = _service.ValidateRefreshToken("");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ValidateRefreshToken_WithWhitespace_ReturnsNull()
    {
        // Act
        var result = _service.ValidateRefreshToken("   ");

        // Assert
        result.Should().BeNull();
    }

    [Theory]
    [InlineData("Admin", "Pro")]
    [InlineData("Buyer", "Free")]
    [InlineData("Broker", "Pro")]
    [InlineData("ServiceTeam", "Pro")]
    public void GenerateAccessToken_HandlesAllRolesAndTiers(string role, string tier)
    {
        // Act
        var token = _service.GenerateAccessToken("user-456", "user@test.com", role, tier);
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        // Assert
        jwtToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == role);
        jwtToken.Claims.Should().Contain(c => c.Type == "subscription_tier" && c.Value == tier);
    }
}
