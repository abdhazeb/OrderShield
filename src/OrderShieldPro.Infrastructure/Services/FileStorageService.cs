using OrderShieldPro.Application.Common.Interfaces;

namespace OrderShieldPro.Infrastructure.Services;

/// <summary>
/// Local file storage implementation for development.
/// In production, replace with Azure Blob Storage implementation.
/// </summary>
public class FileStorageService : IFileStorageService
{
    private readonly string _storagePath;

    public FileStorageService()
    {
        _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
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
        var fullPath = Path.Combine(_storagePath, storagePath);
        if (File.Exists(fullPath))
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
}
