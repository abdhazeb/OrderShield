using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Subscriptions.Queries;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Infrastructure.Persistence;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// Payment proofs carry bank and transaction details, so access is limited to the user who
/// submitted the request and to moderators. These tests pin that rule.
/// </summary>
public class GetPaymentProofQueryHandlerTests
{
    private const string OwnerId = "user-owner";
    private const string OtherUserId = "user-other";

    private static ApplicationDbContext CreateContext(out SubscriptionRequest request)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"PaymentProofTests_{Guid.NewGuid()}")
            .Options;

        var context = new ApplicationDbContext(options);

        request = new SubscriptionRequest
        {
            Id = Guid.NewGuid(),
            UserId = OwnerId,
            PaymentProofFileName = "receipt.pdf",
            PaymentProofStoragePath = "abc123_receipt.pdf"
        };

        context.SubscriptionRequests.Add(request);
        context.SaveChanges();
        return context;
    }

    private static GetPaymentProofQueryHandler CreateHandler(
        ApplicationDbContext context, string? userId, string? role)
    {
        var currentUser = new Mock<ICurrentUserService>();
        currentUser.SetupGet(c => c.UserId).Returns(userId);
        currentUser.SetupGet(c => c.Role).Returns(role);
        return new GetPaymentProofQueryHandler(context, currentUser.Object);
    }

    [Fact]
    public async Task Handle_WhenCallerIsOwner_ReturnsFile()
    {
        using var context = CreateContext(out var request);
        var handler = CreateHandler(context, OwnerId, "Buyer");

        var result = await handler.Handle(new GetPaymentProofQuery(request.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        result.Data!.StoragePath.Should().Be("abc123_receipt.pdf");
        result.Data.FileName.Should().Be("receipt.pdf");
    }

    [Theory]
    [InlineData("ServiceTeam")]
    [InlineData("Admin")]
    [InlineData("SuperAdmin")]
    public async Task Handle_WhenCallerIsModerator_ReturnsFile(string role)
    {
        using var context = CreateContext(out var request);
        var handler = CreateHandler(context, OtherUserId, role);

        var result = await handler.Handle(new GetPaymentProofQuery(request.Id), CancellationToken.None);

        result.Succeeded.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WhenCallerIsAnotherUser_IsDenied()
    {
        using var context = CreateContext(out var request);
        var handler = CreateHandler(context, OtherUserId, "Buyer");

        var result = await handler.Handle(new GetPaymentProofQuery(request.Id), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        result.Data.Should().BeNull();
        // The denial must be indistinguishable from a missing file.
        result.Errors.Should().ContainSingle().Which.Should().Be("Payment proof not found.");
    }

    [Fact]
    public async Task Handle_WhenNotAuthenticated_IsDenied()
    {
        using var context = CreateContext(out var request);
        var handler = CreateHandler(context, null, null);

        var result = await handler.Handle(new GetPaymentProofQuery(request.Id), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenRequestDoesNotExist_IsDenied()
    {
        using var context = CreateContext(out _);
        var handler = CreateHandler(context, OwnerId, "Buyer");

        var result = await handler.Handle(new GetPaymentProofQuery(Guid.NewGuid()), CancellationToken.None);

        result.Succeeded.Should().BeFalse();
    }
}
