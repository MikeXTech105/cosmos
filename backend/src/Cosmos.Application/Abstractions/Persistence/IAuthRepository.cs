using Cosmos.Contracts.Common;
using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IAuthRepository
{
    Task<User?> GetUserForLoginAsync(string usernameOrEmail, CancellationToken cancellationToken);
    Task SaveRefreshTokenAsync(int userId, string token, DateTime expiryDate, CancellationToken cancellationToken);
    Task<RefreshToken?> GetRefreshTokenAsync(string token, CancellationToken cancellationToken);
    Task RevokeRefreshTokenAsync(string token, CancellationToken cancellationToken);
    Task<OperationResult> UpdatePasswordAsync(int userId, string passwordHash, CancellationToken cancellationToken);
    Task<OperationResult> CreatePasswordResetTokenAsync(string email, string resetToken, DateTime expiryDate, CancellationToken cancellationToken);
    Task<OperationResult> ResetPasswordAsync(string email, string resetToken, string passwordHash, CancellationToken cancellationToken);
}
