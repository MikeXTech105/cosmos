namespace Cosmos.Application.Abstractions.Services;

public interface IWebsiteFileStorage
{
    Task<string> SavePrivateWarrantyEvidenceAsync(string fileName, ReadOnlyMemory<byte> content, CancellationToken ct);
    Task DeletePrivateWarrantyEvidenceAsync(string storageKey, CancellationToken ct);
    Task<Stream?> OpenPrivateWarrantyEvidenceReadAsync(string storageKey, CancellationToken ct);
}
