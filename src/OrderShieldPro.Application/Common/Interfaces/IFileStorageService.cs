namespace OrderShieldPro.Application.Common.Interfaces;

/// <summary>
/// File storage abstraction — local disk for dev, Azure Blob for production.
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Uploads a file and returns the storage path/URL.
    /// </summary>
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a file by its storage path.
    /// </summary>
    Task DeleteFileAsync(string storagePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a temporary download URL for a file.
    /// </summary>
    Task<string> GetFileUrlAsync(string storagePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Opens a stored file for reading, or returns null if it does not exist or the
    /// supplied path escapes the storage root. Callers are responsible for
    /// authorizing access before calling this.
    /// </summary>
    Task<Stream?> OpenReadAsync(string storagePath, CancellationToken cancellationToken = default);
}
