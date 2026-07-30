using MediatR;
using OrderShieldPro.Application.Common.Models;

namespace OrderShieldPro.Application.Reviews.Commands;

/// <summary>
/// Attaches one or more uploaded files to a review as evidence.
///
/// The handler both stores the bytes and writes the <c>ReviewEvidenceFile</c> rows, so
/// authorization runs before anything reaches disk and no orphan files are left behind
/// when a caller is rejected. Controllers must not write to storage themselves.
/// </summary>
public record AttachReviewEvidenceCommand : IRequest<Result<IReadOnlyList<Guid>>>
{
    public Guid ReviewId { get; init; }

    /// <summary>Files to attach. Streams are read by the handler and not disposed by it.</summary>
    public IReadOnlyList<EvidenceUpload> Files { get; init; } = Array.Empty<EvidenceUpload>();
}

/// <summary>One file being attached: its content plus the metadata to record against it.</summary>
public record EvidenceUpload
{
    public required Stream Content { get; init; }
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
    public required long FileSizeBytes { get; init; }
}
