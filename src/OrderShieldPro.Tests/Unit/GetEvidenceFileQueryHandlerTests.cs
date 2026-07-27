using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Evidence attached to a review is never public: only its author and the moderators
/// assessing it may open the file.
/// </summary>
public class GetEvidenceFileQueryHandlerTests
{
    private const string ReviewerId = "user-reviewer";
    private const string OtherUserId = "user-other";

    private static ApplicationDbContext CreateContext(out Review review, out ReviewEvidenceFile file)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"EvidenceFileTests_{Guid.NewGuid()}")
            .Options;

        var context = new ApplicationDbContext(options);

        review = new Review
        {
            Id = Guid.NewGuid(),
            TradeEntityId = Guid.NewGuid(),
            ReviewerId = ReviewerId,
            Title = "Late shipment",
            Narrative = new string('x', 120),
            VerificationEmail = "reviewer@example.com"
        };

        file = new ReviewEvidenceFile
        {
            Id = Guid.NewGuid(),
            ReviewId = review.Id,
            FileName = "invoice.pdf",
            StoragePath = "def456_invoice.pdf",
            ContentType = "application/pdf",
            FileSizeBytes = 2048
        };

        context.Reviews.Add(review);
        context.ReviewEvidenceFiles.Add(file);
        context.SaveChanges();
        return context;
    }

    private static GetEvidenceFileQueryHandler CreateHandler(
        ApplicationDbContext context, string? userId, string? role)
    {
        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(c => c.UserId).Returns(userId);
        currentUser.SetupGet(c => c.Role).Returns(role);
        return new GetEvidenceFileQueryHandler(context, currentUser.Object);
    }

    [Fact]
    public async Task Handle_WhenCallerWroteTheReview_ReturnsFile()
    {
        using var context = CreateContext(out var review, out var file);
        var handler = CreateHandler(context, ReviewerId, "Broker");

        var result = await handler.Handle(new GetEvidenceFileQuery(review.Id, file.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        result.Data!.StoragePath.Should().Be("def456_invoice.pdf");
    }

    [Theory]
    [InlineData("ServiceTeam")]
    [InlineData("Admin")]
    [InlineData("SuperAdmin")]
    public async Task Handle_WhenCallerIsModerator_ReturnsFile(string role)
    {
        using var context = CreateContext(out var review, out var file);
        var handler = CreateHandler(context, OtherUserId, role);

        var result = await handler.Handle(new GetEvidenceFileQuery(review.Id, file.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WhenCallerIsAnotherUser_IsDenied()
    {
        using var context = CreateContext(out var review, out var file);
        var handler = CreateHandler(context, OtherUserId, "Buyer");

        var result = await handler.Handle(new GetEvidenceFileQuery(review.Id, file.Id), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Errors.Should().ContainSingle().Which.Should().Be("File not found.");
    }

    [Fact]
    public async Task Handle_WhenFileBelongsToADifferentReview_IsDenied()
    {
        using var context = CreateContext(out _, out var file);
        var handler = CreateHandler(context, ReviewerId, "Broker");

        // Mismatched review id must not resolve, even for the file's own author.
        var result = await handler.Handle(new GetEvidenceFileQuery(Guid.NewGuid(), file.Id), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
    }
}
