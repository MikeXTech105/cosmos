namespace Cosmos.API.Middleware;

/// <summary>Keeps mutation requests observable in application logs. Permanent activity rows are written only by successful business/security operations.</summary>
public sealed class AuditMiddleware
{
    private readonly RequestDelegate _next;

    public AuditMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ILogger<AuditMiddleware> logger)
    {
        await _next(context);
        if (IsAuditable(context.Request.Method))
        {
            logger.LogDebug(
                "Mutation request observed in technical logs only. {Method} {Path} completed with {StatusCode}",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode);
        }
    }

    private static bool IsAuditable(string method) =>
        HttpMethods.IsPost(method) ||
        HttpMethods.IsPut(method) ||
        HttpMethods.IsPatch(method) ||
        HttpMethods.IsDelete(method);

}
