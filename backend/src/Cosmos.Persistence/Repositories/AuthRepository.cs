using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Domain.Entities;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class AuthRepository : IAuthRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public AuthRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<User?> GetUserForLoginAsync(string usernameOrEmail, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleWithStatusAsync<User>(connection, "sp_Auth_Login", new { UsernameOrEmail = usernameOrEmail }, cancellationToken);
    }

    public async Task SaveRefreshTokenAsync(int userId, string token, DateTime expiryDate, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Auth_SaveRefreshToken", new { UserId = userId, Token = token, ExpiryDate = expiryDate }, cancellationToken);
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleWithStatusAsync<RefreshToken>(connection, "sp_Auth_RefreshToken", new { Token = token }, cancellationToken);
    }

    public async Task RevokeRefreshTokenAsync(string token, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Auth_Logout", new { Token = token }, cancellationToken);
    }

    public async Task<OperationResult> UpdatePasswordAsync(int userId, string passwordHash, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Auth_ChangePassword", new { UserId = userId, PasswordHash = passwordHash }, cancellationToken);
    }

    public async Task<OperationResult> CreatePasswordResetTokenAsync(string email, string resetToken, DateTime expiryDate, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Auth_ForgotPassword", new { Email = email, ResetToken = resetToken, ExpiryDate = expiryDate }, cancellationToken);
    }

    public async Task<OperationResult> ResetPasswordAsync(string email, string resetToken, string passwordHash, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Auth_ResetPassword", new { Email = email, ResetToken = resetToken, PasswordHash = passwordHash }, cancellationToken);
    }
}
