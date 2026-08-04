using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Entities.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Phone numbers and WeChat IDs are contact details, not public directory data. Entity
/// search still matches on them — someone holding a number can find the entity behind it —
/// but the profile must not list every number an entity answers on, or the directory turns
/// into a scrapeable contact database. The gate lives here rather than in the template
/// because a value serialized into this response is public regardless of what is rendered.
/// </summary>
public class GetEntityByIdQueryHandlerTests
{
    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"GetEntityByIdTests_{Guid.NewGuid()}")
            .Options);

    private static TradeEntity EntityWithContactDetails()
    {
        var entity = new TradeEntity
        {
            Id = Guid.NewGuid(),
            LegalName = "Linyi Shengde Plastic Co., Ltd",
            Country = "China"
        };
        entity.PhoneNumbers.Add(new EntityPhoneNumber { TradeEntityId = entity.Id, PhoneNumber = "18660902700" });
        entity.WeChatIds.Add(new EntityWeChatId { TradeEntityId = entity.Id, WeChatId = "shengde_sales" });
        entity.HistoricalNames.Add(new EntityHistoricalName { TradeEntityId = entity.Id, PreviousName = "临沂盛德塑胶有限公司" });
        return entity;
    }

    private static GetEntityByIdQueryHandler CreateHandler(
        ApplicationDbContext context, TradeEntity entity, string? role)
    {
        var repo = new Mock<ITradeEntityRepository>();
        repo.Setup(r => r.GetByIdWithDetailsAsync(entity.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(entity);

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.Setup(s => s.Role).Returns(role);
        currentUser.Setup(s => s.IsAuthenticated).Returns(role is not null);
        currentUser.Setup(s => s.UserId).Returns(role is null ? null : "user-1");

        return new GetEntityByIdQueryHandler(repo.Object, context, currentUser.Object);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("Broker")]
    [InlineData("Buyer")]
    public async Task Handle_WithholdsContactDetailsFromNonModerators(string? role)
    {
        using var context = CreateContext();
        var entity = EntityWithContactDetails();

        var result = await CreateHandler(context, entity, role)
            .Handle(new GetEntityByIdQuery(entity.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        result.Data!.PhoneNumbers.Should().BeEmpty();
        result.Data.WeChatIds.Should().BeEmpty();
        // Other names stay public — publishing them is the point of rebrand tracking, and
        // they are how a reviewer recognizes a supplier that has since renamed itself.
        result.Data.HistoricalNames.Should().ContainSingle().Which.Should().Be("临沂盛德塑胶有限公司");
    }

    [Theory]
    [InlineData("ServiceTeam")]
    [InlineData("Admin")]
    [InlineData("SuperAdmin")]
    public async Task Handle_GivesContactDetailsToModerators(string role)
    {
        using var context = CreateContext();
        var entity = EntityWithContactDetails();

        var result = await CreateHandler(context, entity, role)
            .Handle(new GetEntityByIdQuery(entity.Id), CancellationToken.None);

        // Moderators judge reports against these and edit the entity through a form that
        // replaces the whole collection — an empty list here would silently wipe them.
        result.Data!.PhoneNumbers.Should().ContainSingle().Which.Should().Be("18660902700");
        result.Data.WeChatIds.Should().ContainSingle().Which.Should().Be("shengde_sales");
    }

    [Fact]
    public async Task Handle_HiddenEntity_IsNotFoundForThePublic()
    {
        using var context = CreateContext();
        var entity = EntityWithContactDetails();
        entity.IsHidden = true;

        var act = () => CreateHandler(context, entity, "Broker")
            .Handle(new GetEntityByIdQuery(entity.Id), CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
