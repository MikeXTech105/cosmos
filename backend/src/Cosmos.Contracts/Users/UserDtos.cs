using System.ComponentModel;
using Cosmos.Contracts.Auth;

namespace Cosmos.Contracts.Users;

public sealed record UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? UpdatedOn { get; set; }
    public IReadOnlyCollection<RoleDto> Roles { get; set; } = Array.Empty<RoleDto>();
}
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
