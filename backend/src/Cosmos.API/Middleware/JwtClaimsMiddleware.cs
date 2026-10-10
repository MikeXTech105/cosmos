namespace Cosmos.API.Middleware;

public sealed class JwtClaimsMiddleware
{
    private readonly RequestDelegate _next;

    public JwtClaimsMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true && context.User.FindFirst("UserId") is null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            var correlationId = context.Items.TryGetValue(CorrelationIdMiddleware.HeaderName, out var value) ? value?.ToString() : null;
            await context.Response.WriteAsJsonAsync(
                Cosmos.Shared.Responses.ApiResponse.Failure(
                    "Unauthorized",
                    new[] { "Access token is missing required UserId claim." },
                    correlationId),
                context.RequestAborted);
            return;
        }

        await _next(context);
    }
}
