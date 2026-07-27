using MediatR;
using OrderShieldPro.Application.Common.Models;
using OrderShieldPro.Application.Reviews.DTOs;

namespace OrderShieldPro.Application.Reviews.Queries;

/// <summary>
/// Resolves a review evidence file for download, after checking the caller may see it.
/// Files are addressed by (review, file) id so stored names cannot be enumerated.
/// </summary>
public record GetEvidenceFileQuery(Guid ReviewId, Guid FileId) : IRequest<Result<EvidenceFileDownloadDto>>;
