using System.IdentityModel.Tokens.Jwt;
using Cosmos.Domain.Entities;
using Cosmos.Infrastructure.Security;
using Cosmos.Shared.Options;
using Microsoft.Extensions.Options;

namespace Cosmos.Tests.Security;

public sealed class JwtTokenServiceTests
{
    [Fact]
    public void CreateAccessToken_StoresOnlyAllowedBusinessClaims()
    {
        var service = new JwtTokenService(Options.Create(new JwtOptions
        {
            Issuer = "CosmosERP",
            Audience = "CosmosERP.Clients",
            SigningKey = "test_signing_key_that_is_longer_than_32_bytes",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 30
        }));

        var (token, expiresOn) = service.CreateAccessToken(new User
        {
            Id = 7,
            Username = "admin",
            Email = "admin@cosmoserp.com",
            FullName = "Admin"
        });

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.True(expiresOn > DateTime.UtcNow);
        Assert.Contains(jwt.Claims, c => c.Type == "UserId" && c.Value == "7");
        Assert.Contains(jwt.Claims, c => c.Type == "Username" && c.Value == "admin");
        Assert.Contains(jwt.Claims, c => c.Type == "Email" && c.Value == "admin@cosmoserp.com");
        Assert.DoesNotContain(jwt.Claims, c => c.Type.Contains("role", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(jwt.Claims, c => c.Type.Contains("permission", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(jwt.Claims, c => c.Type.Contains("page", StringComparison.OrdinalIgnoreCase));
    }
}
