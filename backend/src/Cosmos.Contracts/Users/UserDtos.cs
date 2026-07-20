using System.ComponentModel;

namespace Cosmos.Contracts.Users;

public sealed record UserDto(int Id, string Username, string Email, string FullName, bool IsActive, bool IsDeleted, DateTime CreatedOn, DateTime? UpdatedOn);
public sealed record CreateUserRequest(string Username, string Email, string FullName, string Password, bool IsActive);
public sealed record UpdateUserRequest(string Email, string FullName, bool IsActive);
public sealed record AssignUserRolesRequest(IReadOnlyCollection<int> RoleIds);

public sealed record UserExportDto(
    [property: DisplayName("Full Name")] string FullName,
    [property: DisplayName("Username")] string Username,
    [property: DisplayName("Email")] string Email,
    [property: DisplayName("Role(s)")] string Roles,
    [property: DisplayName("Status")] string Status,
    [property: DisplayName("Created At")] DateTime CreatedAt);
