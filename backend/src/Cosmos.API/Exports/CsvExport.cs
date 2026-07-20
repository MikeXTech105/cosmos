using System.Globalization;
using System.ComponentModel;
using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Exports;

internal static class CsvExport
{
    public static void RequireCsv(string? format)
    {
        if (string.IsNullOrWhiteSpace(format) || string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        throw new Cosmos.Shared.Exceptions.CosmosException(
            "Only CSV export format is supported.",
            StatusCodes.Status400BadRequest,
            new[] { "Format must be csv." },
            new Dictionary<string, IReadOnlyCollection<string>>(StringComparer.Ordinal)
            {
                ["Format"] = new[] { "Format must be csv." }
            });
    }

    public static FileContentResult Create<T>(IEnumerable<T> rows, string downloadName)
    {
        var properties = typeof(T).GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(property => property.CanRead)
            .ToArray();
        var content = new StringBuilder();
        content.AppendLine(string.Join(',', properties.Select(property => Escape(Header(property)))));

        foreach (var row in rows)
        {
            content.AppendLine(string.Join(',', properties.Select(property => Escape(Format(property.GetValue(row))))));
        }

        var bytes = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(content.ToString());
        return new FileContentResult(bytes, "text/csv; charset=utf-8") { FileDownloadName = downloadName };
    }

    private static string Format(object? value) => value switch
    {
        null => string.Empty,
        DateTime dateTime => dateTime.ToString("O", CultureInfo.InvariantCulture),
        DateOnly dateOnly => dateOnly.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString() ?? string.Empty
    };

    private static string Header(PropertyInfo property) =>
        property.GetCustomAttribute<DisplayNameAttribute>()?.DisplayName ?? property.Name;

    private static string Escape(string value) => $"\"{value.Replace("\"", "\"\"")}\"";
}
