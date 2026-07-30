using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Exceptions;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Domain.Entities;

namespace OrderShieldPro.Application.Reviews.Commands;

public class AttachReviewEvidenceCommandHandler
    : IRequestHandler<AttachReviewEvidenceCommand, Result<IReadOnlyList<Guid>>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IFileStorageService _fileStorage;

    public AttachReviewEvidenceCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IFileStorageService fileStorage)
    {
        _context = context;
        _currentUserService = currentUserService;
        _fileStorage = fileStorage;
    }

    public async Task<Result<IReadOnlyList<Guid>>> Handle(
        AttachReviewEvidenceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (userId is null)
            return Result<IReadOnlyList<Guid>>.Failure("You must be authenticated to upload evidence.");

        var review = await _context.Reviews
            .FirstOrDefaultAsync(r => r.Id == request.ReviewId, cancellationToken);
        if (review is null)
            throw new NotFoundException(nameof(Review), request.ReviewId);

        // Only the reviewer who submitted the review, or a moderator assessing it, may
        // attach evidence to it.
        var isOwner = string.Equals(review.ReviewerId, userId, StringComparison.Ordinal);
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);
        if (!isOwner && !isModerator)
            throw new ForbiddenAccessException();

        if (request.Files.Count == 0)
            return Result<IReadOnlyList<Guid>>.Failure("No files were supplied.");

        var attachedIds = new List<Guid>(request.Files.Count);
        foreach (var upload in request.Files)
        {
            var storagePath = await _fileStorage.UploadFileAsync(
                upload.Content, upload.FileName, upload.ContentType, cancellationToken);

            var evidence = new ReviewEvidenceFile
            {
                ReviewId = review.Id,
                FileName = upload.FileName,
                StoragePath = storagePath,
                ContentType = upload.ContentType,
                FileSizeBytes = upload.FileSizeBytes
            };

            _context.ReviewEvidenceFiles.Add(evidence);
            attachedIds.Add(evidence.Id);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<IReadOnlyList<Guid>>.Success(attachedIds);
    }
}
