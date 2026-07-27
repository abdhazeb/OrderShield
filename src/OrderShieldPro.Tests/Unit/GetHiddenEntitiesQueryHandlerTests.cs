using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Entities.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;
using OrderShieldPro.Infrastructure.Repositories;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// The Admin → Hidden Content screen depends on this query returning exactly the entities
/// a moderator hid, and only those — a public search leak or a missed one both defeat the
/// purpose of having a restore workflow at all.
/// </summary>
public class GetHiddenEntitiesQueryHandlerTests
{
    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"GetHiddenEntitiesTests_{Guid.NewGuid()}")
            .Options);

    [Fact]
    public async Task Handle_ReturnsOnlyHiddenEntities()
    {
        using var context = CreateContext();
        var hidden = new TradeEntity { Id = Guid.NewGuid(), LegalName = "Hidden Co.", Country = "China", IsHidden = true };
        var visible = new TradeEntity { Id = Guid.NewGuid(), LegalName = "Visible Co.", Country = "China", IsHidden = false };
        context.TradeEntities.AddRange(hidden, visible);
        await context.SaveChangesAsync();

        var repository = new TradeEntityRepository(context);
        var identityService = new Mock<IIdentityService>();
        identityService
            .Setup(s => s.GetUserDisplayNamesAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, string>());

        var handler = new GetHiddenEntitiesQueryHandler(repository, identityService.Object);

        var result = await handler.Handle(new GetHiddenEntitiesQuery(), CancellationToken.None);

        result.Items.Should().ContainSingle();
        result.Items[0].Id.Should().Be(hidden.Id);
        result.Items[0].LegalName.Should().Be("Hidden Co.");
    }

    [Fact]
    public async Task Handle_ResolvesHiddenByNameFromUpdatedBy()
    {
        using var context = CreateContext();
        var hidden = new TradeEntity
        {
            Id = Guid.NewGuid(),
            LegalName = "Hidden Co.",
            Country = "China",
            IsHidden = true,
            UpdatedBy = "admin-1"
        };
        context.TradeEntities.Add(hidden);
        await context.SaveChangesAsync();

        var repository = new TradeEntityRepository(context);
        var identityService = new Mock<IIdentityService>();
        identityService
            .Setup(s => s.GetUserDisplayNamesAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, string> { ["admin-1"] = "Sarah Chen" });

        var handler = new GetHiddenEntitiesQueryHandler(repository, identityService.Object);

        var result = await handler.Handle(new GetHiddenEntitiesQuery(), CancellationToken.None);

        result.Items[0].HiddenByName.Should().Be("Sarah Chen");
    }
}
