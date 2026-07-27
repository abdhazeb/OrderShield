using OrderShieldPro.Application.Common.Interfaces;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Local file storage implementation. All stored files live in a single flat
/// directory, so every path coming from a caller is resolved and checked against
/// that root before it is touched — a stored path is only ever a bare file name.
/// In production this can be swapped for an Azure Blob Storage implementation.
/// </summary>
public class FileStorageService : IFileStorageService
{
    private readonly string _storagePath;

    public FileStorageService()
        : this(Path.Combine(Directory.GetCurrentDirectory(), "uploads"))
    {
    }

    /// <summary>
    /// Creates a service rooted at an explicit directory. Lets callers (and tests) avoid
    /// depending on the process-wide current directory.
    /// </summary>
    public FileStorageService(string storageRoot)
    {
        _storagePath = storageRoot;
        if (!Directory.Exists(_storagePath))
        {
            Directory.CreateDirectory(_storagePath);
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        // Generate unique file path
        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
        var filePath = Path.Combine(_storagePath, uniqueFileName);

        using var outputStream = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(outputStream, cancellationToken);

        return uniqueFileName;
    }

    public Task DeleteFileAsync(string storagePath, CancellationToken cancellationToken = default)
    {
        var fullPath = ResolveWithinStorageRoot(storagePath);
        if (fullPath is not null && File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        return Task.CompletedTask;
    }

    public Task<string> GetFileUrlAsync(string storagePath, CancellationToken cancellationToken = default)
    {
        // For local dev, return a relative URL that the API can serve
        return Task.FromResult($"/uploads/{storagePath}");
    }

    public Task<Stream?> OpenReadAsync(string storagePath, CancellationToken cancellationToken = default)
    {
        var fullPath = ResolveWithinStorageRoot(storagePath);
        if (fullPath is null || !File.Exists(fullPath))
            return Task.FromResult<Stream?>(null);

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    /// <summary>
    /// Resolves a caller-supplied storage path to an absolute path inside the storage
    /// root, or null if it is empty, contains directory separators, or resolves outside
    /// the root. This is the single choke point that prevents path traversal.
    /// </summary>
    private string? ResolveWithinStorageRoot(string storagePath)
    {
        if (string.IsNullOrWhiteSpace(storagePath))
            return null;

        // Stored paths are always bare file names; anything else is malformed or hostile.
        if (storagePath != Path.GetFileName(storagePath))
            return null;

        var root = Path.GetFullPath(_storagePath);
        var candidate = Path.GetFullPath(Path.Combine(root, storagePath));

        // Guard against tricks that survive GetFileName (e.g. alternate data streams).
        return candidate.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            ? candidate
            : null;
    }
}
