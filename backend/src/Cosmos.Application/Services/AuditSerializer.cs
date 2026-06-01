using System.Text.Json;

namespace Cosmos.Application.Services;

internal static class AuditSerializer
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);
}
