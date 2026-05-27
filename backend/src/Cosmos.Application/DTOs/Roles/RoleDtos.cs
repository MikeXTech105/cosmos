namespace Cosmos.Application.DTOs.Roles;

public sealed record CreateRoleRequest(string RoleName, string? Description, bool IsActive = true);
public sealed record UpdateRoleRequest(string RoleName, string? Description, bool IsActive);
public sealed record RoleResponse(Guid Id, string RoleName, string? Description, bool IsActive, DateTime CreatedAt);
