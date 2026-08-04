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
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly CreateReviewCommandHandler _handler;
    private readonly string _testUserId = Guid.NewGuid().ToString();

    public CreateReviewCommandHandlerTests()
    {
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _currentUserServiceMock = new Mock<ICurrentUserService>();
        _entityRepoMock = new Mock<ITradeEntityRepository>();
        _reviewRepoMock = new Mock<IReviewRepository>();
        _notificationServiceMock = new Mock<INotificationService>();

        _unitOfWorkMock.Setup(u => u.TradeEntities).Returns(_entityRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.Reviews).Returns(_reviewRepoMock.Object);

        _currentUserServiceMock.Setup(s => s.IsAuthenticated).Returns(true);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(_testUserId);

        _handler = new CreateReviewCommandHandler(
            _unitOfWorkMock.Object,
            _currentUserServiceMock.Object,
            _notificationServiceMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesReviewAndReturnsId()
    {
        // Arrange
        var entityId = Guid.NewGuid();
        SetupEntity(entityId);

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
        SetupEntity(entityId);

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

        SetupEntity(entityId);

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

        SetupEntity(entityId);

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

    /// <summary>
    /// The handler loads the selected entity with its collections rather than just probing
    /// for existence, because the alternative names and phone numbers on the command are
    /// merged onto it. Returns the tracked instance so a test can assert on what was added.
    /// </summary>
    private TradeEntity SetupEntity(Guid entityId, string legalName = "Existing Supplier Co.")
    {
        var entity = new TradeEntity { Id = entityId, LegalName = legalName, Country = "China" };
        _entityRepoMock.Setup(r => r.GetByIdWithDetailsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(entity);
        return entity;
    }

    [Fact]
    public async Task Handle_AlternativeNames_AreRecordedOnTheEntitySoSearchFindsIt()
    {
        var entityId = Guid.NewGuid();
        var entity = SetupEntity(entityId);
        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = CreateValidCommand(entityId) with
        {
            // The legal name is already on file and must not be duplicated as an alias;
            // the two genuinely new names must be.
            AlternativeEntityNames = new List<string> { "临沂盛德塑胶有限公司", "existing supplier co.", "Shengde Plastics" }
        };

        await _handler.Handle(command, CancellationToken.None);

        entity.HistoricalNames.Select(h => h.PreviousName)
            .Should().BeEquivalentTo(new[] { "临沂盛德塑胶有限公司", "Shengde Plastics" });
    }

    [Fact]
    public async Task Handle_PhoneNumbers_AreMergedOntoTheEntityWithoutDuplicates()
    {
        var entityId = Guid.NewGuid();
        var entity = SetupEntity(entityId);
        entity.PhoneNumbers.Add(new EntityPhoneNumber { TradeEntityId = entityId, PhoneNumber = "+8613800000000" });
        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = CreateValidCommand(entityId) with
        {
            ContactPhoneUsed = "+8613800000000",
            AdditionalPhoneNumbers = new List<string> { "+8613911111111", "", "n/a" }
        };

        await _handler.Handle(command, CancellationToken.None);

        entity.PhoneNumbers.Select(p => p.PhoneNumber)
            .Should().BeEquivalentTo(new[] { "+8613800000000", "+8613911111111" });
    }

    [Fact]
    public async Task Handle_NewEntity_KeepsTheTypedNameAsLegalNameAndTheRestAsAliases()
    {
        _entityRepoMock.Setup(r => r.FindByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TradeEntity?)null);

        TradeEntity? created = null;
        _entityRepoMock.Setup(r => r.AddAsync(It.IsAny<TradeEntity>(), It.IsAny<CancellationToken>()))
            .Callback<TradeEntity, CancellationToken>((e, _) => created = e)
            .ReturnsAsync((TradeEntity e, CancellationToken _) => e);
        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = CreateValidCommand(null) with
        {
            EntityName = "Linyi Shengde Plastic Co., Ltd",
            SupplierCountry = "China",
            AlternativeEntityNames = new List<string> { "临沂盛德塑胶有限公司" },
            ContactPhoneUsed = "+8613800000000"
        };

        await _handler.Handle(command, CancellationToken.None);

        created.Should().NotBeNull();
        created!.LegalName.Should().Be("Linyi Shengde Plastic Co., Ltd");
        created.HistoricalNames.Should().ContainSingle(h => h.PreviousName == "临沂盛德塑胶有限公司");
        created.PhoneNumbers.Should().ContainSingle(p => p.PhoneNumber == "+8613800000000");
    }

    [Fact]
    public async Task Handle_ExistingEntityKnownByAnAlternativeName_ReusesItInsteadOfCreatingADuplicate()
    {
        var entityId = Guid.NewGuid();
        var existing = new TradeEntity { Id = entityId, LegalName = "Linyi Shengde Plastic Co., Ltd", Country = "China" };

        // The reviewer typed the Chinese name, which matches nothing; the alternative they
        // added is the one on file.
        _entityRepoMock.Setup(r => r.FindByNameAsync("临沂盛德塑胶有限公司", It.IsAny<CancellationToken>()))
            .ReturnsAsync((TradeEntity?)null);
        _entityRepoMock.Setup(r => r.FindByNameAsync("Linyi Shengde Plastic Co., Ltd", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _entityRepoMock.Setup(r => r.GetByIdWithDetailsAsync(entityId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _reviewRepoMock.Setup(r => r.AddAsync(It.IsAny<Review>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Review r, CancellationToken _) => r);

        var command = CreateValidCommand(null) with
        {
            EntityName = "临沂盛德塑胶有限公司",
            AlternativeEntityNames = new List<string> { "Linyi Shengde Plastic Co., Ltd" }
        };

        var result = await _handler.Handle(command, CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        _entityRepoMock.Verify(r => r.AddAsync(It.IsAny<TradeEntity>(), It.IsAny<CancellationToken>()), Times.Never);
        // The name the reviewer knew it by is now searchable too.
        existing.HistoricalNames.Should().ContainSingle(h => h.PreviousName == "临沂盛德塑胶有限公司");
    }

    private CreateReviewCommand CreateValidCommand(Guid? entityId) => new()
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
