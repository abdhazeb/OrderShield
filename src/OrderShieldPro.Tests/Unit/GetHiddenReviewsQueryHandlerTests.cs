using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Infrastructure.Persistence;
using OrderShieldPro.Infrastructure.Repositories;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Hidden reviews (Status == Hidden) must be listed separately from ordinary moderation
/// rejections (Status == Rejected) — they are a different event (a published review
/// withdrawn later) and only Hidden ones belong on the restore screen.
/// </summary>
public class GetHiddenReviewsQueryHandlerTests
{
    private static ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"GetHiddenReviewsTests_{Guid.NewGuid()}")
            .Options);

    private static Review CreateReview(Guid entityId, ReviewStatus status) => new()
    {
        Id = Guid.NewGuid(),
        TradeEntityId = entityId,
        ReviewerId = "user-1",
        Status = status,
        Title = "A review",
        Narrative = new string('x', 120),
        VerificationEmail = "reviewer@example.com"
    };

    [Fact]
    public async Task Handle_ReturnsOnlyHiddenReviews_NotRejectedOrPublished()
    {
        using var context = CreateContext();
        var entity = new TradeEntity { Id = Guid.NewGuid(), LegalName = "Test Co.", Country = "China" };
        context.TradeEntities.Add(entity);
        context.Reviews.AddRange(
            CreateReview(entity.Id, ReviewStatus.Hidden),
            CreateReview(entity.Id, ReviewStatus.Rejected),
            CreateReview(entity.Id, ReviewStatus.Published),
            CreateReview(entity.Id, ReviewStatus.Pending));
        await context.SaveChangesAsync();

        var repository = new ReviewRepository(context);
        var identityService = new Mock<IIdentityService>();
        identityService
            .Setup(s => s.GetUserDisplayNamesAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, string>());

        var handler = new GetHiddenReviewsQueryHandler(repository, identityService.Object);

        var result = await handler.Handle(new GetHiddenReviewsQuery(), CancellationToken.None);

        result.Items.Should().ContainSingle();
        result.Items[0].Status.Should().Be(ReviewStatus.Hidden);
        result.Items[0].TradeEntityName.Should().Be("Test Co.");
    }
}
