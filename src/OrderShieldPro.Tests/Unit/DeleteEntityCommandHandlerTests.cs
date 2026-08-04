using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Entities.Commands;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Reviews are verified business records, so an entity that still has any must not be
/// deletable — the admin is directed to hide it instead.
/// </summary>
public class DeleteEntityCommandHandlerTests
{
    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"DeleteEntityTests_{Guid.NewGuid()}")
            .Options);

    private static TradeEntity CreateEntity() => new()
    {
        Id = Guid.NewGuid(),
        LegalName = "Shenzhen Test Co.",
        Country = "China"
    };

    private static Review CreateReview(Guid entityId) => new()
    {
        Id = Guid.NewGuid(),
        TradeEntityId = entityId,
        ReviewerId = "user-1",
        Title = "Late shipment",
        Narrative = new string('x', 120),
        VerificationEmail = "reviewer@example.com"
    };

    /// <summary>
    /// The profile page shows TradeEntity's denormalized counts, which only track published
    /// reviews — so an entity reading "0 reviews" can still be undeletable because its
    /// submissions are sitting in the moderation queue. This is the case that looked like a
    /// bug when the refusal reached a moderator as untranslated English prose.
    /// </summary>
    [Fact]
    public async Task Handle_WhenOnlyPendingReviewsExist_IsStillRefused()
    {
        using var context = CreateContext();
        var entity = CreateEntity();
        entity.TotalReviewCount = 0; // Nothing published yet — the profile shows zero.
        context.TradeEntities.Add(entity);

        var pending = CreateReview(entity.Id);
        pending.Status = ReviewStatus.Pending;
        context.Reviews.Add(pending);
        await context.SaveChangesAsync();

        var repo = new Mock<ITradeEntityRepository>();
        repo.Setup(r => r.GetByIdAsync(entity.Id, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(u => u.TradeEntities).Returns(repo.Object);

        var handler = new DeleteEntityCommandHandler(unitOfWork.Object, context);

        var result = await handler.Handle(new DeleteEntityCommand(entity.Id), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Code.Should().Be("entityHasReviews");
        repo.Verify(r => r.RemoveAsync(It.IsAny<TradeEntity>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenEntityHasReviews_IsRefusedAndNothingIsRemoved()
    {
        using var context = CreateContext();
        var entity = CreateEntity();
        context.TradeEntities.Add(entity);
        context.Reviews.Add(CreateReview(entity.Id));
        context.Reviews.Add(CreateReview(entity.Id));
        await context.SaveChangesAsync();

        var repo = new Mock<ITradeEntityRepository>();
        repo.Setup(r => r.GetByIdAsync(entity.Id, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(u => u.TradeEntities).Returns(repo.Object);

        var handler = new DeleteEntityCommandHandler(unitOfWork.Object, context);

        var result = await handler.Handle(new DeleteEntityCommand(entity.Id), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Errors.Should().ContainSingle().Which.Should().Contain("2 review");
        // The UI is localized and cannot show the English sentence above; it keys the
        // message it displays off this code instead.
        result.Code.Should().Be("entityHasReviews");
        repo.Verify(r => r.RemoveAsync(It.IsAny<TradeEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenEntityHasNoReviews_DeletesIt()
    {
        using var context = CreateContext();
        var entity = CreateEntity();
        context.TradeEntities.Add(entity);
        await context.SaveChangesAsync();

        var repo = new Mock<ITradeEntityRepository>();
        repo.Setup(r => r.GetByIdAsync(entity.Id, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(u => u.TradeEntities).Returns(repo.Object);

        var handler = new DeleteEntityCommandHandler(unitOfWork.Object, context);

        var result = await handler.Handle(new DeleteEntityCommand(entity.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        repo.Verify(r => r.RemoveAsync(entity, It.IsAny<CancellationToken>()), Times.Once);
        unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenReviewsBelongToAnotherEntity_StillDeletes()
    {
        using var context = CreateContext();
        var entity = CreateEntity();
        context.TradeEntities.Add(entity);
        // A review against a different entity must not block this deletion.
        context.Reviews.Add(CreateReview(Guid.NewGuid()));
        await context.SaveChangesAsync();

        var repo = new Mock<ITradeEntityRepository>();
        repo.Setup(r => r.GetByIdAsync(entity.Id, It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.SetupGet(u => u.TradeEntities).Returns(repo.Object);

        var handler = new DeleteEntityCommandHandler(unitOfWork.Object, context);

        var result = await handler.Handle(new DeleteEntityCommand(entity.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
    }
}
