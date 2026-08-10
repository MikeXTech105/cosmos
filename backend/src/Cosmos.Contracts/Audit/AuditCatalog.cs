using System.Text.Json;
using System.Text.Json.Nodes;

namespace Cosmos.Contracts.Audit;

/// <summary>Canonical activity action names. Existing module-specific actions remain valid when no canonical equivalent exists.</summary>
public static class AuditActions
{
    public const string Created = "Created";
    public const string Updated = "Updated";
    public const string Deleted = "Deleted";
    public const string SoftDeleted = "SoftDeleted";
    public const string Activated = "Activated";
    public const string Deactivated = "Deactivated";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Confirmed = "Confirmed";
    public const string Cancelled = "Cancelled";
    public const string Finalized = "Finalized";
    public const string Reopened = "Reopened";
    public const string Imported = "Imported";
    public const string Exported = "Exported";
    public const string Transferred = "Transferred";
    public const string PaymentAdded = "PaymentAdded";
    public const string Resigned = "Resigned";
    public const string Rejoined = "Rejoined";
    public const string Assigned = "Assigned";
    public const string Unassigned = "Unassigned";
    public const string PermissionChanged = "PermissionChanged";
    public const string PasswordChanged = "PasswordChanged";
    public const string LoginSucceeded = "LoginSucceeded";
    public const string LoginFailed = "LoginFailed";
    public const string Logout = "Logout";

    public static string Normalize(string? action) => action?.Trim().ToUpperInvariant() switch
    {
        "CREATE" => Created,
        "UPDATE" => Updated,
        "DELETE" => Deleted,
        "SOFTDELETE" => SoftDeleted,
        "ACTIVATE" => Activated,
        "DEACTIVATE" => Deactivated,
        "APPROVE" => Approved,
        "REJECT" => Rejected,
        "CONFIRM" => Confirmed,
        "CANCEL" => Cancelled,
        "FINALIZE" => Finalized,
        "REOPEN" => Reopened,
        "IMPORT" => Imported,
        "EXPORT" => Exported,
        "TRANSFER" => Transferred,
        "RESIGN" => Resigned,
        "REJOIN" => Rejoined,
        "ASSIGN" => Assigned,
        "UNASSIGN" => Unassigned,
        "LOGOUT" => Logout,
        _ => string.IsNullOrWhiteSpace(action) ? Updated : action.Trim()
    };
}

public static class AuditModules
{
    public const string Security = "Security";
    public const string Masters = "Masters";
    public const string Items = "Items";
    public const string Parties = "Parties";
    public const string Sales = "Sales";
    public const string Purchase = "Purchase";
    public const string Hr = "HR";
    public const string Gst = "GST";
    public const string Oee = "OEE";
    public const string Rojmel = "Rojmel";
    public const string ProcurementPlanning = "ProcurementPlanning";
    public const string SupplyChain = "SupplyChain";
    public const string DispatchPlanning = "DispatchPlanning";
    public const string ShipmentOperations = "ShipmentOperations";
    public const string DataBook = "DataBook";
    public const string General = "General";

    public static string Infer(string? tableName)
    {
        var value = tableName?.Trim() ?? string.Empty;
        if (value.StartsWith("HR.", StringComparison.OrdinalIgnoreCase)) return Hr;
        if (value.StartsWith("Dispatch", StringComparison.OrdinalIgnoreCase)) return DispatchPlanning;
        if (value.StartsWith("Shipment", StringComparison.OrdinalIgnoreCase)) return ShipmentOperations;
        if (value.StartsWith("Procurement", StringComparison.OrdinalIgnoreCase)) return ProcurementPlanning;
        if (value.StartsWith("SupplyChain", StringComparison.OrdinalIgnoreCase) || value.StartsWith("Channel", StringComparison.OrdinalIgnoreCase)) return SupplyChain;
        if (value.StartsWith("Oee", StringComparison.OrdinalIgnoreCase)) return Oee;

        return value switch
        {
            "Categories" or "Units" => Masters,
            "Items" => Items,
            "Parties" or "PartySettings" => Parties,
            "SalesInvoices" or "SalesInvoicePayments" => Sales,
            "PurchaseBills" or "PurchaseOrders" or "PurchaseReturns" or "SupplierPayments" or "Expenses" or "ExpenseCategories" => Purchase,
            "CompanyGstRegistrations" or "GstApiLogs" => Gst,
            "Wallets" or "WalletTransactions" or "WalletTransfers" => Rojmel,
            "DataBookEntries" => DataBook,
            "Users" or "Roles" or "UserRoles" or "RolePermissions" or "Pages" or "Authentication" => Security,
            _ => General
        };
    }
}

/// <summary>Redacts unsafe JSON fields and reduces object updates to a stable, shallow before/after diff.</summary>
public static class AuditPayloadSanitizer
{
    private const int MaxPayloadLength = 16_384;
    private static readonly string[] SensitiveNames =
    [
        "password", "passwordhash", "token", "authorization", "cookie", "apikey", "secret", "connectionstring", "otp", "credential",
        "privatekey", "accesskey", "session", "cvv", "cardnumber", "bankaccount", "routingnumber", "accountnumber", "ifsc", "upi",
        "mobile", "phone", "email", "address", "pincode", "dateofbirth", "filepath", "profilephotourl", "document", "salary"
    ];
    private static readonly string[] DisplayPropertyNames =
    [
        "Name", "DisplayName", "Code", "ItemName", "PartyName", "InvoiceNumber", "ShipmentNumber", "TransactionNo", "EmployeeCode", "Username"
    ];

    public static AuditPayload Prepare(string? oldValues, string? newValues)
    {
        var oldNode = ParseAndSanitize(oldValues);
        var newNode = ParseAndSanitize(newValues);

        if (oldNode is JsonObject oldObject && newNode is JsonObject newObject)
        {
            var oldDiff = new JsonObject();
            var newDiff = new JsonObject();
            var changedFields = new List<string>();
            foreach (var propertyName in oldObject.Select(pair => pair.Key).Concat(newObject.Select(pair => pair.Key)).Distinct(StringComparer.Ordinal))
            {
                oldObject.TryGetPropertyValue(propertyName, out var oldValue);
                newObject.TryGetPropertyValue(propertyName, out var newValue);
                if (JsonNode.DeepEquals(oldValue, newValue)) continue;

                oldDiff[propertyName] = oldValue?.DeepClone();
                newDiff[propertyName] = newValue?.DeepClone();
                changedFields.Add(propertyName);
            }

            return new AuditPayload(
                SerializeOrNull(oldDiff),
                SerializeOrNull(newDiff),
                changedFields.Count == 0 ? null : JsonSerializer.Serialize(changedFields));
        }

        return new AuditPayload(SerializeOrNull(oldNode), SerializeOrNull(newNode), null);
    }

    public static string? SanitizeJson(string? json) => SerializeOrNull(ParseAndSanitize(json));

    public static string? TryGetEntityDisplayValue(string? json)
    {
        if (ParseAndSanitize(json) is not JsonObject value) return null;
        foreach (var name in DisplayPropertyNames)
        {
            if (value.TryGetPropertyValue(name, out var node) && node is JsonValue jsonValue && jsonValue.TryGetValue<string>(out var text) && !string.IsNullOrWhiteSpace(text))
            {
                return Truncate(text.Trim(), 256);
            }
        }

        return null;
    }

    public static IReadOnlyList<string> ParseChangedFields(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind is not JsonValueKind.Array) return Array.Empty<string>();
            var result = new List<string>();
            foreach (var element in document.RootElement.EnumerateArray())
            {
                var name = element.ValueKind switch
                {
                    JsonValueKind.String => element.GetString(),
                    JsonValueKind.Object when element.TryGetProperty("FieldName", out var legacy) && legacy.ValueKind is JsonValueKind.String => legacy.GetString(),
                    _ => null
                };
                if (!string.IsNullOrWhiteSpace(name) && !IsSensitive(name) && !result.Contains(name, StringComparer.Ordinal)) result.Add(name);
            }

            return result;
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    public static string? SanitizeChangedFieldsJson(string? json)
    {
        var fields = ParseChangedFields(json);
        return fields.Count == 0 ? null : JsonSerializer.Serialize(fields);
    }

    public static JsonElement? ParseForResponse(string? json)
    {
        var safeJson = SanitizeJson(json);
        if (safeJson is null) return null;
        using var document = JsonDocument.Parse(safeJson);
        return document.RootElement.Clone();
    }

    private static JsonNode? ParseAndSanitize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            var node = JsonNode.Parse(json);
            if (node is not JsonObject and not JsonArray) return null;
            Redact(node);
            return node;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static void Redact(JsonNode node)
    {
        if (node is JsonObject objectNode)
        {
            foreach (var property in objectNode.ToList())
            {
                if (IsSensitive(property.Key))
                {
                    objectNode.Remove(property.Key);
                    continue;
                }
                if (property.Value is not null) Redact(property.Value);
            }
            return;
        }

        if (node is JsonArray arrayNode)
        {
            foreach (var child in arrayNode.Where(value => value is not null)) Redact(child!);
        }
    }

    private static bool IsSensitive(string propertyName)
    {
        var normalized = new string(propertyName.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
        return SensitiveNames.Any(name => normalized.Contains(name, StringComparison.Ordinal));
    }

    private static string? SerializeOrNull(JsonNode? node)
    {
        if (node is null) return null;
        var json = node.ToJsonString();
        return json.Length <= MaxPayloadLength ? json : "{\"_truncated\":true}";
    }

    private static string Truncate(string value, int maxLength) => value.Length <= maxLength ? value : value[..maxLength];
}

public sealed record AuditPayload(string? OldValues, string? NewValues, string? ChangedFieldsJson);
