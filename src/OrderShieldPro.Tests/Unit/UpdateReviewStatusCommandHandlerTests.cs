using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.Commands;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// TradeEntity's review-count stats are denormalized off Review.Status, incremented when a
/// review is published. They must also be decremented on the way back out — e.g. an admin
/// hiding a published review by setting it to Rejected — otherwise the entity is left
/// showing stale, non-zero counts for reviews that no longer count as published.
/// </summary>
public class UpdateReviewStatusCommandHandlerTests
{
    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"UpdateReviewStatusTests_{Guid.NewGuid()}")
            .Options);

    private static (TradeEntity Entity, Review Review) SeedPublishedInfoReview(ApplicationDbContext context)
    {
        var entity = new TradeEntity
        {
            Id = Guid.NewGuid(),
            LegalName = "Test Co.",
            Country = "China",
            TotalReviewCount = 1,
            InfoReviewCount = 1
        };

        var review = new Review
        {
            Id = Guid.NewGuid(),
            TradeEntityId = entity.Id,
            ReviewerId = "user-1",
            Severity = SeverityLevel.Info,
            Status = ReviewStatus.Published,
            Title = "A comment",
            Narrative = new string('x', 120),
            VerificationEmail = "reviewer@example.com"
        };

        context.TradeEntities.Add(entity);
        context.Reviews.Add(review);
        context.SaveChanges();
        return (entity, review);
    }

    private static UpdateReviewStatusCommandHandler CreateHandler(ApplicationDbContext context)
    {
        var unitOfWork = new Mock<IUnitOfWork>();
        unitOfWork.Setup(u => u.TradeEntities).Returns(new TestTradeEntityRepo(context));
        unitOfWork.Setup(u => u.Reviews).Returns(new TestReviewRepo(context));
        unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(async (CancellationToken ct) => await context.SaveChangesAsync(ct));

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(c => c.UserId).Returns("admin-1");

        return new UpdateReviewStatusCommandHandler(unitOfWork.Object, currentUser.Object, context);
    }

    [Fact]
    public async Task Handle_HidingAPublishedReview_DecrementsEntityCounts()
    {
        using var context = CreateContext();
        var (entity, review) = SeedPublishedInfoReview(context);
        var handler = CreateHandler(context);

        var result = await handler.Handle(
            new UpdateReviewStatusCommand { ReviewId = review.Id, NewStatus = ReviewStatus.Rejected },
            CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        var reloaded = await context.TradeEntities.FindAsync(entity.Id);
        reloaded!.TotalReviewCount.Should().Be(0);
        reloaded.InfoReviewCount.Should().Be(0);
    }

    [Fact]
    public async Task Handle_DecrementNeverGoesNegative()
    {
        using var context = CreateContext();
        var (entity, review) = SeedPublishedInfoReview(context);
        entity.TotalReviewCount = 0;
        entity.InfoReviewCount = 0;
        await context.SaveChangesAsync();
        var handler = CreateHandler(context);

        var result = await handler.Handle(
            new UpdateReviewStatusCommand { ReviewId = review.Id, NewStatus = ReviewStatus.Rejected },
            CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        var reloaded = await context.TradeEntities.FindAsync(entity.Id);
        reloaded!.TotalReviewCount.Should().Be(0);
        reloaded.InfoReviewCount.Should().Be(0);
    }

    [Fact]
    public async Task Handle_RestoringAHiddenReview_ReIncrementsEntityCounts()
    {
        using var context = CreateContext();
        var entity = new TradeEntity
        {
            Id = Guid.NewGuid(),
            LegalName = "Test Co.",
            Country = "China",
            TotalReviewCount = 0,
            WarningReviewCount = 0
        };
        var review = new Review
        {
            Id = Guid.NewGuid(),
            TradeEntityId = entity.Id,
            ReviewerId = "user-1",
            Severity = SeverityLevel.Warning,
            Status = ReviewStatus.Hidden,
            Title = "Late shipment",
            Narrative = new string('x', 120),
            VerificationEmail = "reviewer@example.com"
        };
        context.TradeEntities.Add(entity);
        context.Reviews.Add(review);
        await context.SaveChangesAsync();

        var handler = CreateHandler(context);

        var result = await handler.Handle(
            new UpdateReviewStatusCommand { ReviewId = review.Id, NewStatus = ReviewStatus.Published },
            CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        var reloaded = await context.TradeEntities.FindAsync(entity.Id);
        reloaded!.TotalReviewCount.Should().Be(1);
        reloaded.WarningReviewCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_PublishingAPendingReview_IncrementsEntityCounts()
    {
        using var context = CreateContext();
        var entity = new TradeEntity { Id = Guid.NewGuid(), LegalName = "Test Co.", Country = "China" };
        var review = new Review
        {
            Id = Guid.NewGuid(),
            TradeEntityId = entity.Id,
            ReviewerId = "user-1",
            Severity = SeverityLevel.Critical,
            Status = ReviewStatus.Pending,
            Title = "Late shipment",
            Narrative = new string('x', 120),
            VerificationEmail = "reviewer@example.com"
        };
        context.TradeEntities.Add(entity);
        context.Reviews.Add(review);
        await context.SaveChangesAsync();

        var handler = CreateHandler(context);

        var result = await handler.Handle(
            new UpdateReviewStatusCommand { ReviewId = review.Id, NewStatus = ReviewStatus.Published },
            CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        var reloaded = await context.TradeEntities.FindAsync(entity.Id);
        reloaded!.TotalReviewCount.Should().Be(1);
        reloaded.CriticalReviewCount.Should().Be(1);
    }

    private class TestTradeEntityRepo : ITradeEntityRepository
    {
        private readonly ApplicationDbContext _context;
        public TestTradeEntityRepo(ApplicationDbContext context) => _context = context;

        public Task<TradeEntity?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            _context.TradeEntities.FirstOrDefaultAsync(e => e.Id == id, ct);
        public Task<TradeEntity?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default) => GetByIdAsync(id, ct);
        public Task<(IReadOnlyList<TradeEntity> Items, int TotalCount)> SearchAsync(
            string? searchTerm, EntityType? entityType, string? country, string? productCategory,
            SeverityLevel? severityFilter, int page, int pageSize, string? sortBy = null,
            bool includeHidden = false, CancellationToken ct = default) =>
            throw new NotImplementedException();
        public Task<TradeEntity> AddAsync(TradeEntity entity, CancellationToken ct = default) => throw new NotImplementedException();
        public Task UpdateAsync(TradeEntity entity, CancellationToken ct = default)
        {
            _context.TradeEntities.Update(entity);
            return Task.CompletedTask;
        }
        public Task RemoveAsync(TradeEntity entity, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> ExistsAsync(Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<(IReadOnlyList<TradeEntity> Items, int TotalCount)> GetHiddenAsync(int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
        public Task<IReadOnlyList<TradeEntity>> FindByContactInfoAsync(string? phoneNumber, string? weChatId, CancellationToken ct = default) =>
            throw new NotImplementedException();
        public Task<TradeEntity?> FindByNameAsync(string legalName, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private class TestReviewRepo : IReviewRepository
    {
        private readonly ApplicationDbContext _context;
        public TestReviewRepo(ApplicationDbContext context) => _context = context;

        public Task<Review?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
            _context.Reviews.FirstOrDefaultAsync(r => r.Id == id, ct);
        public Task<Review?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default) => GetByIdAsync(id, ct);
        public Task<(IReadOnlyList<Review> Items, int TotalCount)> GetByEntityIdAsync(
            Guid entityId, int page, int pageSize, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<(IReadOnlyList<Review> Items, int TotalCount)> GetByUserIdAsync(
            string userId, int page, int pageSize, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<(IReadOnlyList<Review> Items, int TotalCount)> GetPendingAsync(
            int page, int pageSize, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Review> AddAsync(Review review, CancellationToken ct = default) => throw new NotImplementedException();
        public Task UpdateAsync(Review review, CancellationToken ct = default)
        {
            _context.Reviews.Update(review);
            return Task.CompletedTask;
        }
        public Task RemoveAsync(Review review, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<int> GetCountByEntityAndSeverityAsync(Guid entityId, SeverityLevel severity, CancellationToken ct = default) =>
            throw new NotImplementedException();
        public Task<(IReadOnlyList<Review> Items, int TotalCount)> GetHiddenAsync(int page, int pageSize, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }
}
