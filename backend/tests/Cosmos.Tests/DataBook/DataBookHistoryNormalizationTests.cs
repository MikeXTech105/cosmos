using System.Text.Json;
using Cosmos.Contracts.DataBook;

namespace Cosmos.Tests.DataBook;

public sealed class DataBookHistoryNormalizationTests
{
    [Fact]
    public void Created_history_keeps_canonical_string_fields_and_has_no_old_snapshot()
    {
        var result = Normalize("[\"Name\",\"Value\",\"Description\"]", oldDataJson: null);

        Assert.Equal(new[] { "Name", "Value", "Description" }, result.History.ChangedFields);
        Assert.Null(result.History.OldData);
        Assert.Equal("New value", result.History.NewData!.Value);
        Assert.False(result.HasMalformedJson);
    }

    [Fact]
    public void Legacy_object_form_history_is_normalized_without_modifying_its_raw_representation()
    {
        var result = Normalize("[{\"FieldName\":\"Value\"}]");

        Assert.Equal(new[] { "Value" }, result.History.ChangedFields);
#pragma warning disable CS0618
        Assert.Equal("[{\"FieldName\":\"Value\"}]", result.History.ChangedFieldsJson);
#pragma warning restore CS0618
    }

    [Fact]
    public void Canonical_history_is_normalized_as_a_string_array()
    {
        var result = Normalize("[\"Value\"]");

        Assert.Equal(new[] { "Value" }, result.History.ChangedFields);
        Assert.False(result.HasMalformedChangedFields);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("[]")]
    public void Null_or_empty_changed_field_metadata_does_not_throw(string? changedFieldsJson)
    {
        var result = Normalize(changedFieldsJson);

        Assert.Empty(result.History.ChangedFields);
        Assert.False(result.HasMalformedChangedFields);
    }

    [Fact]
    public void Malformed_changed_field_metadata_degrades_safely()
    {
        var result = Normalize("not-json");

        Assert.Empty(result.History.ChangedFields);
        Assert.True(result.HasMalformedChangedFields);
    }

    [Fact]
    public void Snapshots_are_structured_and_preserve_business_and_audit_fields()
    {
        var result = Normalize("[\"Value\"]");

        Assert.Equal("Old value", result.History.OldData!.Value);
        Assert.Equal("New value", result.History.NewData!.Value);
        Assert.Equal(2, result.History.NewData.OwnerUserId);
        Assert.Equal(7, result.History.NewData.UpdatedBy);
        Assert.Equal(DateTimeKind.Utc, result.History.NewData.UpdatedAtUtc!.Value.Kind);
    }

    [Fact]
    public void Value_only_and_multiple_business_changes_are_preserved_without_audit_fields()
    {
        var oneField = Normalize("[\"Value\"]");
        var multipleFields = Normalize("[\"Name\",\"Category\"]");

        Assert.Equal(new[] { "Value" }, oneField.History.ChangedFields);
        Assert.Equal(new[] { "Name", "Category" }, multipleFields.History.ChangedFields);
        Assert.DoesNotContain("UpdatedAtUtc", multipleFields.History.ChangedFields);
        Assert.DoesNotContain("UpdatedBy", multipleFields.History.ChangedFields);
    }

    [Fact]
    public void New_contract_serializes_utc_history_time_and_pascal_snapshot_keys()
    {
        var result = Normalize("[\"Value\"]");

        using var json = JsonDocument.Parse(JsonSerializer.Serialize(result.History, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        var root = json.RootElement;
        Assert.Equal("Value", root.GetProperty("changedFields")[0].GetString());
        Assert.Equal("New value", root.GetProperty("newData").GetProperty("Value").GetString());
        Assert.EndsWith("Z", root.GetProperty("changedAtUtc").GetString(), StringComparison.Ordinal);
    }

    private static DataBookHistoryNormalizationResult Normalize(string? changedFieldsJson) =>
        Normalize(changedFieldsJson, Snapshot("Old value"));

    private static DataBookHistoryNormalizationResult Normalize(string? changedFieldsJson, string? oldDataJson) =>
        DataBookHistoryNormalizer.Normalize(new DataBookEntryHistoryRow(
            15,
            5,
            "Updated",
            3,
            "System Owner",
            new DateTime(2026, 8, 10, 5, 19, 14, DateTimeKind.Unspecified),
            changedFieldsJson,
            oldDataJson,
            Snapshot("New value"),
            "fbc56953eee64d22ac7e8e29574a1ffd"));

    private static string Snapshot(string value) =>
        $$"""{"Name":"Entry","Value":"{{value}}","Description":"Description","Category":"Category","IsPrivate":false,"OwnerUserId":2,"CreatedBy":2,"CreatedAtUtc":"2026-08-10T05:14:59.376","UpdatedBy":7,"UpdatedAtUtc":"2026-08-10T05:19:14.303","DeletedBy":null,"DeletedAtUtc":null,"IsDeleted":false}""";
}
