namespace Cosmos.Contracts.Roles;

public sealed record RoleDetailDto(int Id, string Name, string? Description, bool IsActive, DateTime CreatedOn);
public sealed record CreateRoleRequest(string Name, string? Description, bool IsActive);
public sealed record UpdateRoleRequest(string Name, string? Description, bool IsActive);
