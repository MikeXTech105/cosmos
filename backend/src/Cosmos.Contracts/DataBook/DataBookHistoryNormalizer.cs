using System.Text.Json;

namespace Cosmos.Contracts.DataBook;

/// <summary>Normalizes immutable Data Book history storage JSON into the public API contract.</summary>
public static class DataBookHistoryNormalizer
{
    private static readonly JsonSerializerOptions SnapshotJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    /// <summary>Parses both canonical string arrays and the legacy SQL object-array format without mutating history.</summary>
    public static DataBookHistoryNormalizationResult Normalize(DataBookEntryHistoryRow row)
    {
        var (changedFields, changedFieldsMalformed) = NormalizeChangedFields(row.ChangedFieldsJson);
        var (oldData, oldDataMalformed) = ParseSnapshot(row.OldDataJson);
        var (newData, newDataMalformed) = ParseSnapshot(row.NewDataJson);

        return new DataBookHistoryNormalizationResult(
            new DataBookEntryHistoryDto(
                row.Id,
                row.EntryId,
                row.ActionType,
                row.ChangedByUserId,
                row.ChangedByName,
                AsUtc(row.ChangedAtUtc),
                changedFields,
                oldData,
                newData,
                row.CorrelationId)
            {
#pragma warning disable CS0618
                ChangedFieldsJson = row.ChangedFieldsJson,
                OldDataJson = row.OldDataJson,
                NewDataJson = row.NewDataJson
#pragma warning restore CS0618
            },
            changedFieldsMalformed,
            oldDataMalformed,
            newDataMalformed);
    }

    private static (IReadOnlyList<string> Value, bool IsMalformed) NormalizeChangedFields(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return (Array.Empty<string>(), false);

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind is JsonValueKind.Null) return (Array.Empty<string>(), false);
            if (document.RootElement.ValueKind is not JsonValueKind.Array) return (Array.Empty<string>(), true);

            var fields = new List<string>();
            var malformedElement = false;
            foreach (var element in document.RootElement.EnumerateArray())
            {
                var fieldName = element.ValueKind switch
                {
                    JsonValueKind.String => element.GetString(),
                    JsonValueKind.Object when TryGetFieldName(element, out var legacyFieldName) => legacyFieldName,
                    _ => null
                };

                if (string.IsNullOrWhiteSpace(fieldName))
                {
                    malformedElement = true;
                    continue;
                }

                if (!fields.Contains(fieldName, StringComparer.Ordinal)) fields.Add(fieldName);
            }

            return (fields, malformedElement);
        }
        catch (JsonException)
        {
            return (Array.Empty<string>(), true);
        }
    }

    private static bool TryGetFieldName(JsonElement element, out string? fieldName)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, "FieldName", StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind is JsonValueKind.String)
            {
                fieldName = property.Value.GetString();
                return true;
            }
        }

        fieldName = null;
        return false;
    }

    private static (DataBookEntryHistorySnapshotDto? Value, bool IsMalformed) ParseSnapshot(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return (null, false);

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind is JsonValueKind.Null) return (null, false);
            if (document.RootElement.ValueKind is not JsonValueKind.Object) return (null, true);

            var snapshot = JsonSerializer.Deserialize<DataBookEntryHistorySnapshotDto>(json, SnapshotJsonOptions);
            return snapshot is null ? (null, true) : (NormalizeUtc(snapshot), false);
        }
        catch (JsonException)
        {
            return (null, true);
        }
    }

    private static DataBookEntryHistorySnapshotDto NormalizeUtc(DataBookEntryHistorySnapshotDto snapshot) => snapshot with
    {
        CreatedAtUtc = AsUtc(snapshot.CreatedAtUtc),
        UpdatedAtUtc = AsUtc(snapshot.UpdatedAtUtc),
        DeletedAtUtc = AsUtc(snapshot.DeletedAtUtc)
    };

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        _ => value.ToUniversalTime()
    };

    private static DateTime? AsUtc(DateTime? value) => value.HasValue ? AsUtc(value.Value) : null;
}

public sealed record DataBookHistoryNormalizationResult(
    DataBookEntryHistoryDto History,
    bool HasMalformedChangedFields,
    bool HasMalformedOldData,
    bool HasMalformedNewData)
{
    public bool HasMalformedJson => HasMalformedChangedFields || HasMalformedOldData || HasMalformedNewData;
}
