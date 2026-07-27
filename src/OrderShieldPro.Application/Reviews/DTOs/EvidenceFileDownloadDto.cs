namespace OrderShieldPro.Application.Reviews.DTOs;

/// <summary>
/// Location of a stored evidence file, returned only to callers that have passed the
/// authorization check in GetEvidenceFileQueryHandler. Distinct from EvidenceFileDto,
/// which is the metadata shape listed on a review and carries no storage path.
/// </summary>
public record EvidenceFileDownloadDto
{
    public string StoragePath { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
}
