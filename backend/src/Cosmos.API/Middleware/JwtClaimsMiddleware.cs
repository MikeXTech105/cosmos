namespace Cosmos.API.Middleware;

public sealed class JwtClaimsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string? _companyKey;

    public JwtClaimsMiddleware(RequestDelegate next, IConfiguration? configuration = null)
    {
        _next = next;
        _companyKey = configuration?["Manufacturing:CatalogCompanyKey"];
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true && !string.IsNullOrWhiteSpace(_companyKey) &&
            !string.Equals(context.User.FindFirst("CompanyKey")?.Value, _companyKey, StringComparison.Ordinal))
            throw new Cosmos.Shared.Exceptions.ForbiddenCosmosException("The access token does not belong to this catalog company. Sign in again after the company cutover.");
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
