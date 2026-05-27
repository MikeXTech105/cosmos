using Cosmos.Application.Abstractions.Repositories;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Database;
using Dapper;

namespace Cosmos.Infrastructure.Repositories;

public sealed class AuthRepository(IDbConnectionFactory connectionFactory) : BaseRepository(connectionFactory), IAuthRepository
{
    public async Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<User>(Command(
            "select * from cosmos.fn_auth_get_user_by_email(@Email);",
            new { Email = email },
            cancellationToken));
    }

    public async Task<User?> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<User>(Command(
            "select * from cosmos.fn_users_get_by_id(@UserId);",
            new { UserId = userId },
            cancellationToken));
    }

    public async Task SaveRefreshTokenAsync(Guid userId, string tokenHash, DateTime expiresAt, Guid? createdBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_refresh_tokens_create(@UserId, @TokenHash, @ExpiresAt, @CreatedBy);",
            new { UserId = userId, TokenHash = tokenHash, ExpiresAt = expiresAt, CreatedBy = createdBy },
            cancellationToken));
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<RefreshToken>(Command(
            "select * from cosmos.fn_refresh_tokens_get(@TokenHash);",
            new { TokenHash = tokenHash },
            cancellationToken));
    }

    public async Task RevokeRefreshTokenAsync(string tokenHash, Guid? updatedBy, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(Command(
            "select cosmos.fn_refresh_tokens_revoke(@TokenHash, @UpdatedBy);",
            new { TokenHash = tokenHash, UpdatedBy = updatedBy },
            cancellationToken));
    }
}
