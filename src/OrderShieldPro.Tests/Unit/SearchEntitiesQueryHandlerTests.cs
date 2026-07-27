using FluentAssertions;
using Moq;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.DTOs;
using OrderShieldPro.Application.Entities.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Tests.Unit;

public class SearchEntitiesQueryHandlerTests
{
    private readonly Mock<ITradeEntityRepository> _repositoryMock;
    private readonly SearchEntitiesQueryHandler _handler;

    public SearchEntitiesQueryHandlerTests()
    {
        _repositoryMock = new Mock<ITradeEntityRepository>();
        _handler = new SearchEntitiesQueryHandler(_repositoryMock.Object);
    }

    [Fact]
    public async Task Handle_SearchByName_ReturnsMatchingEntities()
    {
        // Arrange
        var entities = new List<TradeEntity>
        {
            CreateEntity("Shenzhen Aluminum Co.", EntityType.Supplier, "China"),
            CreateEntity("Shenzhen Steel Works", EntityType.Supplier, "China")
        };

        _repositoryMock.Setup(r => r.SearchAsync(
            "Shenzhen", null, null, null, null, 1, 20, null,
            false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((entities.AsReadOnly() as IReadOnlyList<TradeEntity>, 2));

        var query = new SearchEntitiesQuery { SearchTerm = "Shenzhen", Page = 1, PageSize = 20 };

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Items.Should().AllSatisfy(e => e.LegalName.Should().Contain("Shenzhen"));
    }

    [Fact]
    public async Task Handle_SearchByPhone_ReturnsMatchingEntities()
    {
        // Arrange
        var entity = CreateEntity("Test Supplier", EntityType.Supplier, "China");
        var entities = new List<TradeEntity> { entity };

        _repositoryMock.Setup(r => r.SearchAsync(
            "+86-755-8888", null, null, null, null, 1, 20, null,
            false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((entities.AsReadOnly() as IReadOnlyList<TradeEntity>, 1));

        var query = new SearchEntitiesQuery { SearchTerm = "+86-755-8888", Page = 1, PageSize = 20 };

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Items.Should().HaveCount(1);
        result.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_SearchByWeChat_ReturnsMatchingEntities()
    {
        // Arrange
        var entity = CreateEntity("Test Supplier", EntityType.Supplier, "China");
        var entities = new List<TradeEntity> { entity };

        _repositoryMock.Setup(r => r.SearchAsync(
            "wechat_id", null, null, null, null, 1, 20, null,
            false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((entities.AsReadOnly() as IReadOnlyList<TradeEntity>, 1));

        var query = new SearchEntitiesQuery { SearchTerm = "wechat_id", Page = 1, PageSize = 20 };

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task Handle_EmptySearch_ReturnsAllEntities()
    {
        // Arrange
        var entities = new List<TradeEntity>
        {
            CreateEntity("Entity 1", EntityType.Supplier, "China"),
            CreateEntity("Entity 2", EntityType.Broker, "Hong Kong"),
            CreateEntity("Entity 3", EntityType.Supplier, "Singapore")
        };

        _repositoryMock.Setup(r => r.SearchAsync(
            null, null, null, null, null, 1, 20, null,
            false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((entities.AsReadOnly() as IReadOnlyList<TradeEntity>, 3));

        var query = new SearchEntitiesQuery { Page = 1, PageSize = 20 };

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.Items.Should().HaveCount(3);
        result.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task Handle_WithFilters_PassesFiltersToRepository()
    {
        // Arrange
        _repositoryMock.Setup(r => r.SearchAsync(
            "test", EntityType.Supplier, "China", "Metals", SeverityLevel.Critical, 2, 10, "recent",
            false, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<TradeEntity>().AsReadOnly() as IReadOnlyList<TradeEntity>, 0));

        var query = new SearchEntitiesQuery
        {
            SearchTerm = "test",
            EntityType = EntityType.Supplier,
            Country = "China",
            ProductCategory = "Metals",
            SeverityFilter = SeverityLevel.Critical,
            Page = 2,
            PageSize = 10,
            SortBy = "recent"
        };

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        _repositoryMock.Verify(r => r.SearchAsync(
            "test", EntityType.Supplier, "China", "Metals", SeverityLevel.Critical, 2, 10, "recent",
            false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ReturnsCorrectDtoMapping()
    {
        // Arrange
        var entity = CreateEntity("Shenzhen Aluminum Co.", EntityType.Supplier, "China");
        entity.TradeName = "SZ Aluminum";
        entity.Region = "Guangdong";
        entity.ProductCategories = "Metals";
        entity.VerificationStatus = VerificationStatus.Verified;
        entity.TotalReviewCount = 5;
        entity.InfoReviewCount = 2;
        entity.WarningReviewCount = 2;
        entity.CriticalReviewCount = 1;
        entity.LastReviewDate = DateTime.UtcNow;

        var entities = new List<TradeEntity> { entity };

        _repositoryMock.Setup(r => r.SearchAsync(
            It.IsAny<string?>(), It.IsAny<EntityType?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<SeverityLevel?>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<bool>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((entities.AsReadOnly() as IReadOnlyList<TradeEntity>, 1));

        var query = new SearchEntitiesQuery { SearchTerm = "Shenzhen" };

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        var dto = result.Items.First();
        dto.LegalName.Should().Be("Shenzhen Aluminum Co.");
        dto.TradeName.Should().Be("SZ Aluminum");
        dto.EntityType.Should().Be(EntityType.Supplier);
        dto.Country.Should().Be("China");
        dto.Region.Should().Be("Guangdong");
        dto.ProductCategories.Should().Be("Metals");
        dto.VerificationStatus.Should().Be(VerificationStatus.Verified);
        dto.TotalReviewCount.Should().Be(5);
        dto.InfoReviewCount.Should().Be(2);
        dto.WarningReviewCount.Should().Be(2);
        dto.CriticalReviewCount.Should().Be(1);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Handle_PassesIncludeHiddenThroughToRepository(bool includeHidden)
    {
        // The repository is what actually filters hidden entities out, so the flag reaching
        // it unchanged is the whole contract — if the handler dropped it, the admin entity
        // table would silently show the public result set instead.
        _repositoryMock.Setup(r => r.SearchAsync(
            It.IsAny<string?>(), It.IsAny<EntityType?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<SeverityLevel?>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<bool>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<TradeEntity>().AsReadOnly() as IReadOnlyList<TradeEntity>, 0));

        await _handler.Handle(new SearchEntitiesQuery { IncludeHidden = includeHidden }, CancellationToken.None);

        _repositoryMock.Verify(r => r.SearchAsync(
            It.IsAny<string?>(), It.IsAny<EntityType?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<SeverityLevel?>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string?>(), includeHidden,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_MapsIsHiddenOntoResults()
    {
        // The admin table renders its Live/Hidden pill and its hide/unhide action off this
        // flag, so it has to survive the projection into the DTO.
        var hidden = CreateEntity("Withheld Trading Co.", EntityType.Supplier, "China");
        hidden.IsHidden = true;
        var visible = CreateEntity("Public Trading Co.", EntityType.Supplier, "China");

        _repositoryMock.Setup(r => r.SearchAsync(
            It.IsAny<string?>(), It.IsAny<EntityType?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<SeverityLevel?>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<bool>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<TradeEntity> { hidden, visible }.AsReadOnly() as IReadOnlyList<TradeEntity>, 2));

        var result = await _handler.Handle(
            new SearchEntitiesQuery { IncludeHidden = true }, CancellationToken.None);

        result.Items.Single(e => e.LegalName == "Withheld Trading Co.").IsHidden.Should().BeTrue();
        result.Items.Single(e => e.LegalName == "Public Trading Co.").IsHidden.Should().BeFalse();
    }

    private static TradeEntity CreateEntity(string name, EntityType type, string country)
    {
        return new TradeEntity
        {
            Id = Guid.NewGuid(),
            LegalName = name,
            EntityType = type,
            Country = country,
            ListedDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
    }
}
