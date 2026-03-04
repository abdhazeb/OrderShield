using OrderShieldPro.Domain.Common;

namespace OrderShieldPro.Domain.Entities;

/// <summary>
/// File uploaded as evidence for a review.
/// </summary>
public class ReviewEvidenceFile : BaseEntity
{
    public Guid ReviewId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }

    // Navigation
    public Review Review { get; set; } = null!;
}
