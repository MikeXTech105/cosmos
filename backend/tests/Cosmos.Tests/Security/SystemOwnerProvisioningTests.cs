using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Shared.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Cosmos.Tests.Security;

public sealed class SystemOwnerProvisioningTests
{
    [Fact]
    public async Task EnsureProvisionedAsync_CreatesOwnerOnlyWhenStateIsEmpty()
    {
        var password = $"A!a1{Guid.NewGuid():N}";
        var repository = new Mock<ISystemOwnerRepository>();
        repository
            .Setup(x => x.GetProvisioningStateAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SystemOwnerProvisioningState(0, 0, 0, 0, 0));
        repository
            .Setup(x => x.ProvisionAsync("systemowner", "systemowner@example.invalid", "runtime-hash", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SystemOwnerProvisioningResult(1, 1, true));
        var hasher = new Mock<IPasswordHasher>();
        hasher.Setup(x => x.Hash(password)).Returns("runtime-hash");
        var service = CreateService(repository, hasher, new SystemOwnerOptions
        {
            Username = "systemowner",
            Email = "systemowner@example.invalid",
            Password = password
        });

        await service.EnsureProvisionedAsync(CancellationToken.None);

        repository.Verify(
            x => x.ProvisionAsync("systemowner", "systemowner@example.invalid", "runtime-hash", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task EnsureProvisionedAsync_RepeatedStartupDoesNotHashOrResetPassword()
    {
        var repository = new Mock<ISystemOwnerRepository>();
        repository
            .Setup(x => x.GetProvisioningStateAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SystemOwnerProvisioningState(1, 1, 1, 0, 0));
        var hasher = new Mock<IPasswordHasher>(MockBehavior.Strict);
        var service = CreateService(repository, hasher, new SystemOwnerOptions());

        await service.EnsureProvisionedAsync(CancellationToken.None);
        await service.EnsureProvisionedAsync(CancellationToken.None);

        hasher.VerifyNoOtherCalls();
        repository.Verify(
            x => x.ProvisionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task EnsureProvisionedAsync_MissingConfigurationFailsWhenOwnerDoesNotExist()
    {
        var repository = new Mock<ISystemOwnerRepository>();
        repository
            .Setup(x => x.GetProvisioningStateAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SystemOwnerProvisioningState(0, 0, 0, 0, 0));
        var service = CreateService(repository, new Mock<IPasswordHasher>(), new SystemOwnerOptions());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnsureProvisionedAsync(CancellationToken.None));

        Assert.Contains(SystemOwnerOptions.UsernameEnvironmentVariable, exception.Message, StringComparison.Ordinal);
        Assert.Contains(SystemOwnerOptions.EmailEnvironmentVariable, exception.Message, StringComparison.Ordinal);
        Assert.Contains(SystemOwnerOptions.PasswordEnvironmentVariable, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EnsureProvisionedAsync_ConflictingFlagsFailClearly()
    {
        var repository = new Mock<ISystemOwnerRepository>();
        repository
            .Setup(x => x.GetProvisioningStateAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SystemOwnerProvisioningState(1, 1, 0, 0, 0));
        var service = CreateService(repository, new Mock<IPasswordHasher>(), new SystemOwnerOptions());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.EnsureProvisionedAsync(CancellationToken.None));

        Assert.Contains("Conflicting", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static SystemOwnerProvisioningService CreateService(
        Mock<ISystemOwnerRepository> repository,
        Mock<IPasswordHasher> hasher,
        SystemOwnerOptions options)
    {
        return new SystemOwnerProvisioningService(
            repository.Object,
            hasher.Object,
            new CreateUserRequestValidator(),
            Options.Create(options),
            NullLogger<SystemOwnerProvisioningService>.Instance);
    }
}
