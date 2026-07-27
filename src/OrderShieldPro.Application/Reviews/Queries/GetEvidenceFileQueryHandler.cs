using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderShieldPro.Application.Common.Interfaces;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

public class GetEvidenceFileQueryHandler
    : IRequestHandler<GetEvidenceFileQuery, Result<EvidenceFileDownloadDto>>
{
    private static readonly string[] ModeratorRoles = { "ServiceTeam", "Admin", "SuperAdmin" };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetEvidenceFileQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<EvidenceFileDownloadDto>> Handle(
        GetEvidenceFileQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (userId is null)
            return Result<EvidenceFileDownloadDto>.Failure("File not found.");

        var file = await _context.ReviewEvidenceFiles
            .AsNoTracking()
            .Include(f => f.Review)
            .FirstOrDefaultAsync(
                f => f.Id == request.FileId && f.ReviewId == request.ReviewId,
                cancellationToken);

        if (file is null)
            return Result<EvidenceFileDownloadDto>.Failure("File not found.");

        // Evidence is never public: only the reviewer who submitted it and the moderators
        // assessing it may open the file. Unauthorized callers get the same "not found"
        // response as a missing file so the endpoint reveals nothing.
        var isOwner = file.Review.ReviewerId == userId;
        var isModerator = _currentUserService.Role is { } role && ModeratorRoles.Contains(role);
        if (!isOwner && !isModerator)
            return Result<EvidenceFileDownloadDto>.Failure("File not found.");

        return Result<EvidenceFileDownloadDto>.Success(new EvidenceFileDownloadDto
        {
            StoragePath = file.StoragePath,
            FileName = file.FileName,
            ContentType = file.ContentType
        });
    }
}
