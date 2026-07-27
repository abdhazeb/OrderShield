namespace OrderShieldPro.Application.Entities.DTOs;

/// <summary>
/// Summary of a bulk entity import — surfaced to the admin so a silent no-op (e.g. every
/// row turned out to be a duplicate) is never mistaken for success.
/// </summary>
public record EntityImportResultDto
{
    public int TotalRows { get; init; }
    public int Created { get; init; }
    /// <summary>Rows skipped because that legal name already exists — either already in
    /// the database, or repeated earlier in the same file.</summary>
    public int SkippedDuplicates { get; init; }
    /// <summary>Rows skipped because they had no legal name at all (not a real entity).</summary>
    public int SkippedInvalid { get; init; }
}
