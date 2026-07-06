using Cosmos.Infrastructure.Security;

namespace Cosmos.Tests.Security;

public sealed class BcryptPasswordHasherTests
{
    [Fact]
    public void Verify_ReturnsTrue_ForMatchingPassword()
    {
        var hasher = new BcryptPasswordHasher();

        var hash = hasher.Hash("Admin@123");

        Assert.True(hasher.Verify("Admin@123", hash));
        Assert.False(hasher.Verify("Wrong@123", hash));
        Assert.StartsWith("$2", hash, StringComparison.Ordinal);
    }
}
