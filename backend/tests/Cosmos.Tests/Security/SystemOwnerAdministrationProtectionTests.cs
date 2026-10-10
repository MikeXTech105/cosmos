using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Permissions;
using Cosmos.Contracts.Roles;
using Cosmos.Contracts.Users;
using Cosmos.Domain.Entities;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Security;
using Moq;

namespace Cosmos.Tests.Security;

public sealed class SystemOwnerAdministrationProtectionTests
{
    [Theory]
    [InlineData("update")]
    [InlineData("delete")]
    [InlineData("activate")]
    [InlineData("deactivate")]
    [InlineData("roles")]
    public async Task ProtectedUserCannotBeMutatedThroughUserService(string operation)
    {
        var users = new Mock<IUserRepository>();
        users
            .Setup(x => x.GetEntityByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = 99, IsSystemUser = true, IsActive = true });
        var service = CreateUserService(users, new Mock<IRoleRepository>());

        Task Act() => operation switch
        {
            "update" => service.UpdateAsync(99, new UpdateUserRequest("owner@example.invalid", "Owner", true), CancellationToken.None),
            "delete" => service.DeleteAsync(99, CancellationToken.None),
            "activate" => service.ActivateAsync(99, CancellationToken.None),
            "deactivate" => service.DeactivateAsync(99, CancellationToken.None),
            "roles" => service.AssignRolesAsync(99, new AssignUserRolesRequest([1]), CancellationToken.None),
            _ => throw new InvalidOperationException()
        };

        var exception = await Assert.ThrowsAsync<NotFoundException>(Act);

        Assert.Equal("User was not found.", exception.Message);
        users.Verify(x => x.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateUserRequest>(), It.IsAny<CancellationToken>()), Times.Never);
        users.Verify(x => x.DeleteAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        users.Verify(x => x.SetActiveAsync(It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        users.Verify(x => x.AssignRolesAsync(It.IsAny<int>(), It.IsAny<IReadOnlyCollection<int>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ProtectedRoleCannotBeAssignedToNormalUser()
    {
        var users = new Mock<IUserRepository>();
        users
            .Setup(x => x.GetEntityByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = 5, IsActive = true });
        var roles = new Mock<IRoleRepository>();
        roles
            .Setup(x => x.GetEntityByIdAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Role { Id = 8, IsSystemRole = true, IsActive = true });
        var service = CreateUserService(users, roles);

        var exception = await Assert.ThrowsAsync<NotFoundException>(
            () => service.AssignRolesAsync(5, new AssignUserRolesRequest([8]), CancellationToken.None));

        Assert.Equal("Role was not found.", exception.Message);
        users.Verify(x => x.AssignRolesAsync(It.IsAny<int>(), It.IsAny<IReadOnlyCollection<int>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("update")]
    [InlineData("delete")]
    public async Task ProtectedRoleCannotBeMutatedThroughRoleService(string operation)
    {
        var roles = new Mock<IRoleRepository>();
        roles
            .Setup(x => x.GetEntityByIdAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Role { Id = 8, IsSystemRole = true, IsActive = true });
        var service = new RoleService(
            roles.Object,
            Mock.Of<IAuditRepository>(),
            new CreateRoleRequestValidator(),
            new UpdateRoleRequestValidator(),
            Mock.Of<ICurrentUser>());

        Task Act() => operation == "update"
            ? service.UpdateAsync(8, new UpdateRoleRequest("Owner", null, true), CancellationToken.None)
            : service.DeleteAsync(8, CancellationToken.None);

        var exception = await Assert.ThrowsAsync<NotFoundException>(Act);

        Assert.Equal("Role was not found.", exception.Message);
        roles.Verify(x => x.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateRoleRequest>(), It.IsAny<CancellationToken>()), Times.Never);
        roles.Verify(x => x.DeleteAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("read")]
    [InlineData("save")]
    public async Task ProtectedRolePermissionsCannotBeReadOrSaved(string operation)
    {
        var roles = new Mock<IRoleRepository>();
        roles
            .Setup(x => x.GetEntityByIdAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Role { Id = 8, IsSystemRole = true, IsActive = true });
        var permissions = new Mock<IPermissionRepository>();
        var service = new PermissionService(
            permissions.Object,
            Mock.Of<IAuditRepository>(),
            Mock.Of<IUserRepository>(),
            roles.Object,
            new SaveRolePermissionsRequestValidator(),
            Mock.Of<ICurrentUser>());

        Task Act() => operation == "read"
            ? service.GetByRoleIdAsync(8, CancellationToken.None)
            : service.SaveAsync(8, new SaveRolePermissionsRequest([]), CancellationToken.None);

        var exception = await Assert.ThrowsAsync<NotFoundException>(Act);

        Assert.Equal("Role was not found.", exception.Message);
        permissions.Verify(x => x.GetByRoleIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        permissions.Verify(x => x.SaveAsync(It.IsAny<int>(), It.IsAny<IReadOnlyCollection<PermissionUpsertDto>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void PublicMutationContractsDoNotExposeProtectedFlags()
    {
        var requestTypes = new[]
        {
            typeof(CreateUserRequest),
            typeof(UpdateUserRequest),
            typeof(CreateRoleRequest),
            typeof(UpdateRoleRequest)
        };

        foreach (var requestType in requestTypes)
        {
            var propertyNames = requestType.GetProperties().Select(x => x.Name).ToArray();
            Assert.DoesNotContain("IsSystemUser", propertyNames, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("IsSystemRole", propertyNames, StringComparer.OrdinalIgnoreCase);
            Assert.DoesNotContain("HasFullAccess", propertyNames, StringComparer.OrdinalIgnoreCase);
        }
    }

    private static UserService CreateUserService(Mock<IUserRepository> users, Mock<IRoleRepository> roles) =>
        new(
            users.Object,
            Mock.Of<IAuditRepository>(),
            roles.Object,
            Mock.Of<IPasswordHasher>(),
            new CreateUserRequestValidator(),
            new UpdateUserRequestValidator(),
            new AssignUserRolesRequestValidator(),
            Mock.Of<ICurrentUser>());
}
