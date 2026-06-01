namespace Cosmos.Contracts.Users;

public sealed record UserDto(int Id, string Username, string Email, string FullName, bool IsActive, bool IsDeleted, DateTime CreatedOn, DateTime? UpdatedOn);
public sealed record CreateUserRequest(string Username, string Email, string FullName, string Password, bool IsActive);
public sealed record UpdateUserRequest(string Email, string FullName, bool IsActive);
public sealed record AssignUserRolesRequest(IReadOnlyCollection<int> RoleIds);
