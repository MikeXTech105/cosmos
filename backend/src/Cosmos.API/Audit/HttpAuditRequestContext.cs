using Cosmos.API.Middleware;
using Cosmos.Contracts.Audit;

namespace Cosmos.API.Audit;

/// <summary>Supplies request metadata to permanent business audits without exposing HttpContext outside the API boundary.</summary>
public sealed class HttpAuditRequestContext(IHttpContextAccessor accessor) : IAuditRequestContext
{
    public AuditRequestContext GetCurrent()
    {
        var context = accessor.HttpContext;
        if (context is null) return new AuditRequestContext(null, null, null, null, null, null, null, null, "Application");

        var userId = int.TryParse(context.User.FindFirst("UserId")?.Value, out var value) ? value : (int?)null;
        var correlationId = context.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var correlation) ? correlation?.ToString() : null;
        return new AuditRequestContext(
            userId,
            context.User.FindFirst("Username")?.Value,
            context.User.FindFirst("FullName")?.Value,
            context.Request.Path.Value,
            context.Request.Method,
            correlationId,
            context.Connection.RemoteIpAddress?.ToString(),
            context.Request.Headers.UserAgent.ToString(),
            "HttpApi");
    }
}
