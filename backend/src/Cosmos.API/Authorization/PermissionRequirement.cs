using Microsoft.AspNetCore.Authorization;

namespace Cosmos.API.Authorization;

public sealed class PermissionRequirement(string permissionKey) : IAuthorizationRequirement
{
    public string PermissionKey { get; } = permissionKey;
}
