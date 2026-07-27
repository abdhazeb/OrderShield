using System.Text;
using FluentAssertions;
using OrderShieldPro.Infrastructure.Services;

namespace OrderShieldPro.Tests.Unit;

/// <summary>
/// FileStorageService is the single choke point protecting the uploads directory, so the
/// containment rules are pinned here. Each test gets its own storage root — the process
/// working directory is never touched, since integration tests run in parallel and resolve
/// their content root from it.
/// </summary>
public class FileStorageServiceTests : IDisposable
{
    private readonly string _root;

    public FileStorageServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"osp_storage_{Guid.NewGuid():N}");
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_root))
                Directory.Delete(_root, recursive: true);
        }
        catch (IOException)
        {
            // A leftover temp directory is not worth failing a test run over.
        }
    }

    private FileStorageService CreateService() =>
        new(Path.Combine(_root, "uploads"));

    [Fact]
    public async Task UploadThenOpenRead_RoundTripsContent()
    {
        var service = CreateService();
        var content = Encoding.UTF8.GetBytes("evidence");

        var storagePath = await service.UploadFileAsync(
            new MemoryStream(content), "evidence.txt", "text/plain");

        await using var stream = await service.OpenReadAsync(storagePath);
        stream.Should().NotBeNull();

        using var reader = new StreamReader(stream!);
        (await reader.ReadToEndAsync()).Should().Be("evidence");
    }

    [Fact]
    public async Task UploadFile_GivesEachFileAUniqueName()
    {
        var service = CreateService();

        var first = await service.UploadFileAsync(new MemoryStream([1]), "same.pdf", "application/pdf");
        var second = await service.UploadFileAsync(new MemoryStream([2]), "same.pdf", "application/pdf");

        first.Should().NotBe(second);
    }

    [Theory]
    [InlineData("../appsettings.Production.json")]
    [InlineData("..\\appsettings.Production.json")]
    [InlineData("subdir/file.txt")]
    [InlineData("C:\\Windows\\win.ini")]
    [InlineData("/etc/passwd")]
    [InlineData("")]
    [InlineData("   ")]
    public async Task OpenRead_RejectsPathsOutsideTheStorageRoot(string hostilePath)
    {
        var service = CreateService();

        var stream = await service.OpenReadAsync(hostilePath);

        stream.Should().BeNull();
    }

    [Fact]
    public async Task OpenRead_ReturnsNullForAMissingFile()
    {
        var service = CreateService();

        var stream = await service.OpenReadAsync("does-not-exist.pdf");

        stream.Should().BeNull();
    }

    [Fact]
    public async Task DeleteFile_RefusesToTouchFilesOutsideTheStorageRoot()
    {
        var service = CreateService();
        var outsideFile = Path.Combine(_root, "secret.txt");
        await File.WriteAllTextAsync(outsideFile, "do not delete");

        // "uploads/../secret.txt" resolves outside the root and must be refused.
        await service.DeleteFileAsync("../secret.txt");

        File.Exists(outsideFile).Should().BeTrue();
    }

    [Fact]
    public async Task DeleteFile_RemovesAFileInsideTheStorageRoot()
    {
        var service = CreateService();
        var storagePath = await service.UploadFileAsync(
            new MemoryStream([1, 2, 3]), "disposable.txt", "text/plain");

        await service.DeleteFileAsync(storagePath);

        (await service.OpenReadAsync(storagePath)).Should().BeNull();
    }
}
