using Cosmos.Shared.Models;

namespace Cosmos.Application.DTOs.Users;

public sealed class UserQueryParameters : QueryParameters
{
    public Guid? RoleId { get; init; }
}

public sealed record CreateUserRequest(string FirstName, string LastName, string Email, string Password, Guid RoleId, bool IsActive = true);
public sealed record UpdateUserRequest(string FirstName, string LastName, string Email, Guid RoleId, bool IsActive);
public sealed record UpdateUserStatusRequest(bool IsActive);
public sealed record UserResponse(Guid Id, string FirstName, string LastName, string Email, Guid RoleId, string RoleName, bool IsActive, DateTime CreatedAt);
