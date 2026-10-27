using System.Text.Json;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IProductionWorkspaceRepository
{
    Task<T> ExecuteAsync<T>(string procedure, string companyKey, long? actorId, object request, CancellationToken ct);
}
