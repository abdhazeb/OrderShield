using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OrderShieldPro.Infrastructure;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// The signing secret is deliberately absent from committed configuration. Startup must
/// fail loudly rather than fall back to a well-known key, which would let anyone forge
/// tokens for any role.
/// </summary>
public class JwtSecretConfigurationTests
{
    private static IConfiguration BuildConfiguration(string? secret)
    {
        var values = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=.;Database=Test;Trusted_Connection=True;",
            ["JwtSettings:Issuer"] = "Suplyrate",
            ["JwtSettings:Audience"] = "SuplyrateClient"
        };

        if (secret is not null)
            values["JwtSettings:Secret"] = secret;

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Fact]
    public void AddInfrastructure_OutsideDevelopment_ThrowsWhenSecretIsMissing()
    {
        var act = () => new ServiceCollection()
            .AddInfrastructure(BuildConfiguration(secret: null), isDevelopment: false);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*JwtSettings:Secret*was not configured*");
    }

    [Fact]
    public void AddInfrastructure_OutsideDevelopment_ThrowsWhenSecretIsTooShort()
    {
        var act = () => new ServiceCollection()
            .AddInfrastructure(BuildConfiguration("too-short"), isDevelopment: false);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*at least 32 characters*");
    }

    [Fact]
    public void AddInfrastructure_OutsideDevelopment_SucceedsWithAStrongSecret()
    {
        var act = () => new ServiceCollection()
            .AddInfrastructure(BuildConfiguration(new string('k', 48)), isDevelopment: false);

        act.Should().NotThrow();
    }

    [Fact]
    public void AddInfrastructure_InDevelopment_FallsBackWhenSecretIsMissing()
    {
        // Local development must keep working without out-of-band configuration.
        var act = () => new ServiceCollection()
            .AddInfrastructure(BuildConfiguration(secret: null), isDevelopment: true);

        act.Should().NotThrow();
    }
}
