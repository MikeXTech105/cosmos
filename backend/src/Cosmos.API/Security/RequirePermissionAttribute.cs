using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Security;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : TypeFilterAttribute
{
    public RequirePermissionAttribute(string pageName, PermissionAction action) : base(typeof(RequirePermissionFilter))
    {
        Arguments = new object[] { pageName, action };
    }
}
