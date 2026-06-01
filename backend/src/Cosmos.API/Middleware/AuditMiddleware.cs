namespace Cosmos.API.Middleware;

public sealed class AuditMiddleware
{
    private readonly RequestDelegate _next;

    public AuditMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ILogger<AuditMiddleware> logger)
    {
        await _next(context);

        if (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method))
        {
            logger.LogInformation("Auditable request {Method} {Path} completed with {StatusCode}", context.Request.Method, context.Request.Path, context.Response.StatusCode);
        }
    }
}
