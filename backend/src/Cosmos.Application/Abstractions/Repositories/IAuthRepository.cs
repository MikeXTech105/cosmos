using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Repositories;

public interface IAuthRepository
{
    Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken);
    Task<User?> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken);
    Task SaveRefreshTokenAsync(Guid userId, string tokenHash, DateTime expiresAt, Guid? createdBy, CancellationToken cancellationToken);
    Task<RefreshToken?> GetRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken);
    Task RevokeRefreshTokenAsync(string tokenHash, Guid? updatedBy, CancellationToken cancellationToken);
}
