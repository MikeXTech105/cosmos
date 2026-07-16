using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Permissions;
using Cosmos.Domain.Entities;
using Cosmos.Domain.Security;
using Cosmos.Shared.Security;
using Moq;

namespace Cosmos.Tests.Security;

public sealed class SystemOwnerAuthorizationTests
{
    public static TheoryData<PermissionAction> SupportedActions => new()
    {
        PermissionAction.View,
        PermissionAction.Create,
        PermissionAction.Edit,
        PermissionAction.Delete,
        PermissionAction.Export,
        PermissionAction.Approve
    };

    [Theory]
    [MemberData(nameof(SupportedActions))]
    public async Task UserHasPermissionAsync_SystemOwnerPassesEverySupportedActionWithoutRolePermissions(PermissionAction action)
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(x => x.GetEntityByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = 42, IsActive = true, IsDeleted = false, IsSystemUser = true });
        userRepository
            .Setup(x => x.IsSystemOwnerAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var permissionRepository = new Mock<IPermissionRepository>(MockBehavior.Strict);
        var service = CreateService(permissionRepository, userRepository);

        var allowed = await service.UserHasPermissionAsync(42, "Future.Module", action, CancellationToken.None);

        Assert.True(allowed);
        permissionRepository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UserHasPermissionAsync_NormalUserStillUsesRolePermissions()
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(x => x.GetEntityByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = 7, IsActive = true, IsDeleted = false });
        userRepository
            .Setup(x => x.IsSystemOwnerAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var permissionRepository = new Mock<IPermissionRepository>();
        permissionRepository
            .Setup(x => x.UserHasPermissionAsync(7, "Users", PermissionAction.View, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var service = CreateService(permissionRepository, userRepository);

        var allowed = await service.UserHasPermissionAsync(7, "Users", PermissionAction.View, CancellationToken.None);

        Assert.False(allowed);
        permissionRepository.Verify(
            x => x.UserHasPermissionAsync(7, "Users", PermissionAction.View, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, true)]
    public async Task UserHasPermissionAsync_InactiveOrDeletedOwnerIsUnauthorized(bool isActive, bool isDeleted)
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(x => x.GetEntityByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = 42, IsActive = isActive, IsDeleted = isDeleted, IsSystemUser = true });
        var permissionRepository = new Mock<IPermissionRepository>(MockBehavior.Strict);
        var service = CreateService(permissionRepository, userRepository);

        var exception = await Assert.ThrowsAsync<Cosmos.Shared.Exceptions.UnauthorizedCosmosException>(
            () => service.UserHasPermissionAsync(42, "Users", PermissionAction.View, CancellationToken.None));

        Assert.Equal(401, exception.StatusCode);
        userRepository.Verify(x => x.IsSystemOwnerAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        permissionRepository.VerifyNoOtherCalls();
    }

    private static PermissionService CreateService(
        Mock<IPermissionRepository> permissionRepository,
        Mock<IUserRepository> userRepository)
    {
        return new PermissionService(
            permissionRepository.Object,
            Mock.Of<IAuditRepository>(),
            userRepository.Object,
            Mock.Of<IRoleRepository>(),
            new SaveRolePermissionsRequestValidator(),
            Mock.Of<ICurrentUser>());
    }
}
