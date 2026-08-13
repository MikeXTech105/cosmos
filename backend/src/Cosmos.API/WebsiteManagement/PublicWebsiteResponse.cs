using Cosmos.Contracts.WebsiteManagement;

namespace Cosmos.API.WebsiteManagement;

internal static class PublicWebsiteResponse
{
    public static bool IsPublicWebsiteRequest(HttpContext context) => context.Request.Path.StartsWithSegments("/api/website", StringComparison.OrdinalIgnoreCase);

    public static WebsitePublicErrorResponse Error(string message, string code, IReadOnlyDictionary<string, IReadOnlyCollection<string>>? errors, string? correlationId)
    {
        var fields = errors is null ? null : errors.ToDictionary(
            pair => pair.Key,
            pair => pair.Value.FirstOrDefault() ?? "The supplied value is invalid.",
            StringComparer.Ordinal);
        return new WebsitePublicErrorResponse(message, code, fields, correlationId);
    }
}
