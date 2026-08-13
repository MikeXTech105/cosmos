using Cosmos.Application.Abstractions.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Cosmos.Infrastructure.WebsiteManagement;

/// <summary>Stores warranty evidence outside the web root. Object storage can replace this implementation without changing workflow services.</summary>
public sealed class LocalWebsiteFileStorage(IHostEnvironment environment, IConfiguration configuration) : IWebsiteFileStorage
{
    private readonly string _root = ResolveRoot(environment, configuration);

    public async Task<string> SavePrivateWarrantyEvidenceAsync(string fileName, ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var storageKey = $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extension}";
        var path = ResolvePath(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, content.ToArray(), ct);
        return storageKey.Replace('\\', '/');
    }

    public Task DeletePrivateWarrantyEvidenceAsync(string storageKey, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var path = ResolvePath(storageKey);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public Task<Stream?> OpenPrivateWarrantyEvidenceReadAsync(string storageKey, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var path = ResolvePath(storageKey);
        Stream? stream = File.Exists(path) ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true) : null;
        return Task.FromResult(stream);
    }

    private static string ResolveRoot(IHostEnvironment environment, IConfiguration configuration)
    {
        var configured = configuration["WebsiteManagement:PrivateStoragePath"];
        var candidate = string.IsNullOrWhiteSpace(configured) ? Path.Combine(environment.ContentRootPath, "App_Data", "website-warranty") : configured;
        return Path.GetFullPath(candidate);
    }

    private string ResolvePath(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey)) throw new InvalidOperationException("Invalid private storage key.");
        var normalized = storageKey.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
        var path = Path.GetFullPath(Path.Combine(_root, normalized));
        if (!path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid private storage key.");
        return path;
    }
}
