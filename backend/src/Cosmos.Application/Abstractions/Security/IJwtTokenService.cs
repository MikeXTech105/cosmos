using Cosmos.Application.DTOs.Auth;
using Cosmos.Domain.Entities;

namespace Cosmos.Application.Abstractions.Security;

public interface IJwtTokenService
{
    TokenResult CreateAccessToken(User user, IReadOnlyCollection<string> permissions);
}
