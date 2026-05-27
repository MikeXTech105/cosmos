using Microsoft.AspNetCore.Authorization;

namespace Cosmos.API.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionAttribute(string permissionKey) : AuthorizeAttribute($"Permission:{permissionKey}")
{
    public string PermissionKey { get; } = permissionKey;
}
