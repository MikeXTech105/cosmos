using Cosmos.Application.Validators;
using Cosmos.Contracts.Users;

namespace Cosmos.Tests.Validation;

public sealed class CreateUserRequestValidatorTests
{
    [Fact]
    public async Task ValidateAsync_RejectsWeakPassword()
    {
        var validator = new CreateUserRequestValidator();
        var request = new CreateUserRequest("admin", "admin@cosmoserp.com", "Admin", "password", true);

        var result = await validator.ValidateAsync(request);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("uppercase", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("number", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("special", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task ValidateAsync_AcceptsEnterprisePassword()
    {
        var validator = new CreateUserRequestValidator();
        var request = new CreateUserRequest("admin", "admin@cosmoserp.com", "Admin", "Admin@123", true);

        var result = await validator.ValidateAsync(request);

        Assert.True(result.IsValid);
    }
}
