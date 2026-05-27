using System.Security.Cryptography;
using System.Text;

namespace Cosmos.Infrastructure.Security;

internal static class RefreshTokenFactory
{
    public static string CreateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
