namespace Cosmos.Application.Abstractions.Services;

public interface ISystemOwnerProvisioningService
{
    Task EnsureProvisionedAsync(CancellationToken cancellationToken);
}
