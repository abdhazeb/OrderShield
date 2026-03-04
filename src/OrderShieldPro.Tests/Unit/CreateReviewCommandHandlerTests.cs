using FluentAssertions;
using Moq;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Reviews.Commands;
using OrderShieldPro.Domain.Entities;
using OrderShieldPro.Domain.Enums;
using OrderShieldPro.Domain.Interfaces;

namespace OrderShieldPro.Tests.Unit;

public class CreateReviewCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<ICurrentUserService> _currentUserServiceMock;
    private readonly Mock<ITradeEntityRepository> _entityRepoMock;
    private readonly Mock<IReviewRepository> _reviewRepoMock;
    private readonly CreateReviewCommandHandler _handler;
    private readonly string _testUserId = Guid.NewGuid().ToString();

    public CreateReviewCommandHandlerTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _entityRepoMock = new Mock<ITradeEntityRepository>();
        _reviewRepoMock = new Mock<IReviewRepository>();

        _unitOfWorkMock.Setup(u => u.TradeEntities).Returns(_entityRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Reviews).Returns(_reviewRepoMock.Object);

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_testUserId);

        _handler = new CreateReviewCommandHandler(_unitOfWorkMock.Object, _currentUserServiceMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesReviewAndReturnsId()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        _entityRepoMock.Setup(r => r.ExistsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = CreateValidCommand(entityId);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Data.Should().NotBeEmpty();
        _reviewRepoMock.Verify(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_EntityNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        _entityRepoMock.Setup(r => r.ExistsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var command = CreateValidCommand(entityId);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_UnauthenticatedUser_ReturnsFailure()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        _entityRepoMock.Setup(r => r.ExistsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(false);
        _currentUserServiceMock.Setup(s => s.UserId).Returns((string?)null);

        var command = CreateValidCommand(entityId);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("authenticated"));
    }

    [Fact]
    public async Task Handle_SetsCorrectReviewProperties()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        Review? capturedReview = null;

        _entityRepoMock.Setup(r => r.ExistsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .Callback<Review, CancellationToken>((r, _) => capturedReview = r)
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = new CreateReviewCommand
        {
            TradeEntityId = entityId,
            ReviewerType = ReviewerType.Broker,
            TransactionRole = "Broker reviewing Supplier",
            Severity = SeverityLevel.Critical,
            Title = "Test Review Title",
            Narrative = new string('A', 150), // Over 100 char minimum
            Product = "Aluminum Sheets",
            ProductCategory = "Metals",
            IncidentDate = DateTime.UtcNow.AddDays(-10),
            OrderValue = 50000m,
            ContactPhoneUsed = "+86-755-1234",
            ContactWeChatUsed = "test_wechat",
            EvidenceLinks = "[\"https://example.com/evidence\"]",
            VerificationEmail = "test@example.com"
        };

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        capturedReview.Should().NotBeNull();
        capturedReview!.TradeEntityId.Should().Be(entityId);
        capturedReview.ReviewerId.Should().Be(_testUserId);
        capturedReview.ReviewerType.Should().Be(ReviewerType.Broker);
        capturedReview.Severity.Should().Be(SeverityLevel.Critical);
        capturedReview.Status.Should().Be(ReviewStatus.Pending);
        capturedReview.Title.Should().Be("Test Review Title");
        capturedReview.Product.Should().Be("Aluminum Sheets");
        capturedReview.OrderValue.Should().Be(50000m);
        capturedReview.ContactPhoneUsed.Should().Be("+86-755-1234");
        capturedReview.ContactWeChatUsed.Should().Be("test_wechat");
        capturedReview.VerificationEmail.Should().Be("test@example.com");
        capturedReview.CreatedBy.Should().Be(_testUserId);
    }

    [Fact]
    public async Task Handle_ReviewAlwaysStartsAsPending()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        Review? capturedReview = null;

        _entityRepoMock.Setup(r => r.ExistsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .Callback<Review, CancellationToken>((r, _) => capturedReview = r)
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = CreateValidCommand(entityId);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        capturedReview.Should().NotBeNull();
        capturedReview!.Status.Should().Be(ReviewStatus.Pending);
    }

    private CreateReviewCommand CreateValidCommand(Guid entityId) => new()
    {
        TradeEntityId = entityId,
        ReviewerType = ReviewerType.Broker,
        TransactionRole = "Broker reviewing Supplier",
        Severity = SeverityLevel.Warning,
        Title = "Test Review",
        Narrative = "This is a detailed narrative for the review that exceeds the minimum character count of one hundred characters required for submission validation purposes.",
        Product = "Test Product",
        ProductCategory = "Metals",
        IncidentDate = DateTime.UtcNow.AddDays(-5),
        OrderValue = 25000m,
        VerificationEmail = "test@test.com"
    };
}
