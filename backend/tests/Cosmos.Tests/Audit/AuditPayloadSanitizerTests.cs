using Cosmos.Contracts.Audit;

namespace Cosmos.Tests.Audit;

public sealed class AuditPayloadSanitizerTests
{
    [Fact]
    public void Object_update_keeps_only_changed_safe_fields_and_reports_their_names()
    {
        var payload = AuditPayloadSanitizer.Prepare(
            "{\"Name\":\"Old\",\"Password\":\"old-secret\",\"Nested\":{\"Token\":\"redact\",\"Count\":1}}",
            "{\"Name\":\"New\",\"Password\":\"new-secret\",\"Nested\":{\"Token\":\"redact\",\"Count\":2}}");

        Assert.Equal("{\"Name\":\"Old\",\"Nested\":{\"Count\":1}}", payload.OldValues);
        Assert.Equal("{\"Name\":\"New\",\"Nested\":{\"Count\":2}}", payload.NewValues);
        Assert.Equal(new[] { "Name", "Nested" }, AuditPayloadSanitizer.ParseChangedFields(payload.ChangedFieldsJson));
        Assert.DoesNotContain("secret", payload.OldValues!, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Token", payload.NewValues!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Detail_parser_never_returns_sensitive_values()
    {
        var detail = AuditPayloadSanitizer.ParseForResponse("{\"ApiKey\":\"abc\",\"Name\":\"Safe\"}");

        Assert.NotNull(detail);
        Assert.True(detail!.Value.TryGetProperty("Name", out var name));
        Assert.Equal("Safe", name.GetString());
        Assert.False(detail.Value.TryGetProperty("ApiKey", out _));
    }

    [Fact]
    public void Explicit_changed_field_metadata_drops_sensitive_field_names()
    {
        var fields = AuditPayloadSanitizer.SanitizeChangedFieldsJson("[\"Name\",\"RefreshToken\",\"PasswordHash\"]");

        Assert.Equal("[\"Name\"]", fields);
    }

    [Fact]
    public void Required_security_secret_names_are_removed_case_insensitively()
    {
        var safe = AuditPayloadSanitizer.SanitizeJson("{\"Password\":\"p\",\"PasswordHash\":\"h\",\"AccessToken\":\"a\",\"RefreshToken\":\"r\",\"Authorization\":\"b\",\"ApiKey\":\"k\",\"Secret\":\"s\",\"ConnectionString\":\"c\",\"Visible\":true}");

        Assert.Equal("{\"Visible\":true}", safe);
    }
}
