using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Security;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Auth;
using Cosmos.Contracts.Users;
using Cosmos.Shared.Security;
using Moq;

namespace Cosmos.Tests.Security;

public sealed class UserRoleDetailsTests
{
    [Fact]
    public async Task GetByIdReturnsAllAssignedRoleDetails()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync(User(7));
        users.Setup(x => x.GetRolesByUserIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new RoleDto(1, "Admin", "Administrator", true), new RoleDto(2, "Manager", null, true)]);

        var response = await CreateService(users).GetByIdAsync(7, CancellationToken.None);

        Assert.Equal("jane", response.Data!.Username);
        Assert.Collection(response.Data.Roles,
            role => Assert.Equal((1, "Admin"), (role.Id, role.Name)),
            role => Assert.Equal((2, "Manager"), (role.Id, role.Name)));
    }

    [Fact]
    public async Task GetAllReturnsAnEmptyRoleCollectionForAUserWithoutRoles()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([User(7), User(8)]);
        users.Setup(x => x.GetRolesByUserIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync([new RoleDto(1, "Admin", null, true)]);
        users.Setup(x => x.GetRolesByUserIdAsync(8, It.IsAny<CancellationToken>())).ReturnsAsync(Array.Empty<RoleDto>());

        var response = await CreateService(users).GetAllAsync(CancellationToken.None);

        var usersResult = response.Data ?? throw new Xunit.Sdk.XunitException("Expected users in the response.");
        var userWithoutRoles = Assert.Single(usersResult, user => user.Id == 8);
        Assert.Empty(userWithoutRoles.Roles);
        Assert.Equal("jane", response.Data.Single(user => user.Id == 7).Username);
    }

    private static UserDto User(int id) => new()
    {
        Id = id,
        Username = "jane",
        Email = "jane@example.test",
        FullName = "Jane Doe",
        IsActive = true,
        IsDeleted = false,
        CreatedOn = DateTime.UtcNow
    };

    private static UserService CreateService(Mock<IUserRepository> users) => new(
        users.Object,
        Mock.Of<IAuditRepository>(),
        Mock.Of<IRoleRepository>(),
        Mock.Of<IPasswordHasher>(),
        new CreateUserRequestValidator(),
        new UpdateUserRequestValidator(),
        new AssignUserRolesRequestValidator(),
        Mock.Of<ICurrentUser>());
}
