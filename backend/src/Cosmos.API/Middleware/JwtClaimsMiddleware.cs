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
            await context.Response.WriteAsJsonAsync(new { message = "Access token is missing required UserId claim." }, context.RequestAborted);
            return;
        }

        await _next(context);
    }
}
