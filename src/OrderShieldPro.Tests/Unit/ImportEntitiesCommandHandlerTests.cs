using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Entities.Commands;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Exercises the dedup rules independently of Excel parsing (that's covered by
/// EntityImportServiceTests) via a fake IEntityImportService returning canned rows.
/// </summary>
public class ImportEntitiesCommandHandlerTests
{
    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"ImportEntitiesTests_{Guid.NewGuid()}")
            .Options);

    private static ParsedEntityRow Row(string legalName, string? phone = null) => new()
    {
        LegalName = legalName,
        Country = "China",
        PhoneNumbers = phone is null ? new List<string>() : new List<string> { phone }
    };

    private ImportEntitiesCommandHandler CreateHandler(ApplicationDbContext context, IReadOnlyList<ParsedEntityRow> rows)
    {
        var importService = new Mock<IEntityImportService>();
        importService
            .Setup(s => s.Parse(It.IsAny<Stream>(), It.IsAny<string>()))
            .Returns(Result<IReadOnlyList<ParsedEntityRow>>.Success(rows));

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(c => c.UserId).Returns("admin-1");

        return new ImportEntitiesCommandHandler(context, importService.Object, currentUser.Object);
    }

    [Fact]
    public async Task Handle_CreatesEachDistinctEntityOnce()
    {
        using var context = CreateContext();
        var handler = CreateHandler(context, new[]
        {
            Row("Shenzhen Test Co."),
            Row("Guangzhou Sample Ltd."),
        });

        var result = await handler.Handle(new ImportEntitiesCommand(Array.Empty<byte>(), "f.xls"), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        result.Data!.Created.Should().Be(2);
        result.Data.TotalRows.Should().Be(2);
        result.Data.SkippedDuplicates.Should().Be(0);
        (await context.TradeEntities.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Handle_SkipsDuplicateLegalNamesWithinTheSameFile()
    {
        using var context = CreateContext();
        // Same company, different casing/spacing — must still count as one duplicate.
        var handler = CreateHandler(context, new[]
        {
            Row("Shenzhen Test Co."),
            Row("shenzhen test co."),
            Row("  Shenzhen Test Co.  "),
        });

        var result = await handler.Handle(new ImportEntitiesCommand(Array.Empty<byte>(), "f.xls"), CancellationToken.None);

        result.Data!.Created.Should().Be(1);
        result.Data.SkippedDuplicates.Should().Be(2);
        (await context.TradeEntities.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Handle_SkipsRowsThatAlreadyExistInTheDatabase()
    {
        using var context = CreateContext();
        context.TradeEntities.Add(new TradeEntity { LegalName = "Existing Supplier Co.", Country = "China" });
        await context.SaveChangesAsync();

        var handler = CreateHandler(context, new[]
        {
            Row("EXISTING SUPPLIER CO."), // same entity, different case
            Row("Brand New Supplier Co."),
        });

        var result = await handler.Handle(new ImportEntitiesCommand(Array.Empty<byte>(), "f.xls"), CancellationToken.None);

        result.Data!.Created.Should().Be(1);
        result.Data.SkippedDuplicates.Should().Be(1);
        (await context.TradeEntities.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Handle_SkipsRowsWithNoLegalName()
    {
        using var context = CreateContext();
        var handler = CreateHandler(context, new[]
        {
            Row(""),
            Row("   "),
            Row("Valid Co."),
        });

        var result = await handler.Handle(new ImportEntitiesCommand(Array.Empty<byte>(), "f.xls"), CancellationToken.None);

        result.Data!.SkippedInvalid.Should().Be(2);
        result.Data.Created.Should().Be(1);
    }

    [Fact]
    public async Task Handle_ImportsPhoneNumbers()
    {
        using var context = CreateContext();
        var handler = CreateHandler(context, new[] { Row("Phone Co.", "13800000000") });

        await handler.Handle(new ImportEntitiesCommand(Array.Empty<byte>(), "f.xls"), CancellationToken.None);

        var entity = await context.TradeEntities.Include(e => e.PhoneNumbers).FirstAsync();
        entity.PhoneNumbers.Should().ContainSingle(p => p.PhoneNumber == "13800000000");
    }

    [Fact]
    public async Task Handle_WhenParsingFails_ReturnsTheParseError()
    {
        using var context = CreateContext();
        var importService = new Mock<IEntityImportService>();
        importService
            .Setup(s => s.Parse(It.IsAny<Stream>(), It.IsAny<string>()))
            .Returns(Result<IReadOnlyList<ParsedEntityRow>>.Failure("Unrecognized format."));
        var currentUser = new Mock<ICurrentUserService>();

        var handler = new ImportEntitiesCommandHandler(context, importService.Object, currentUser.Object);

        var result = await handler.Handle(new ImportEntitiesCommand(Array.Empty<byte>(), "f.xls"), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Errors.Should().Contain("Unrecognized format.");
    }
}
