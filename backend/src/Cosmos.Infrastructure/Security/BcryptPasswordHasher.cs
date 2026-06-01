using Cosmos.Application.Abstractions.Security;

namespace Cosmos.Infrastructure.Security;

public sealed class BcryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

    public bool Verify(string password, string passwordHash) =>
        !string.IsNullOrWhiteSpace(passwordHash) && BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
