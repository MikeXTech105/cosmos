using Cosmos.Contracts.Auth;
using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Security;

public interface ITokenService
{
    (string Token, DateTime ExpiresOn) CreateAccessToken(User user);
    (string Token, DateTime ExpiresOn) CreateRefreshToken();
}
