using Cosmos.Shared.Constants;

namespace Cosmos.Infrastructure.Utilities;

/// <summary>
/// Generates enterprise permission keys from resource keys and actions.
/// </summary>
public static class PermissionKeyGenerator
{
    public static string BuildPageKey(string pageName, string action) =>
        $"{Normalize(pageName)}_PAGE_{Normalize(action)}";

    public static string BuildSectionKey(string sectionKey, string action) =>
        $"{Normalize(sectionKey)}_{Normalize(action)}";

    public static string BuildFieldKey(string fieldKey, string action) =>
        $"{Normalize(fieldKey)}_FIELD_{Normalize(action)}";

    public static IReadOnlyCollection<string> Expand(string baseKey, bool canView, bool canCreate, bool canEdit, bool canDelete, bool canFullAccess)
    {
        if (canFullAccess)
        {
            return new[] { $"{baseKey}_{PermissionActions.FullAccess}" };
        }

        var keys = new List<string>();
        if (canView) keys.Add($"{baseKey}_{PermissionActions.View}");
        if (canCreate) keys.Add($"{baseKey}_{PermissionActions.Create}");
        if (canEdit) keys.Add($"{baseKey}_{PermissionActions.Edit}");
        if (canDelete) keys.Add($"{baseKey}_{PermissionActions.Delete}");
        return keys;
    }

    public static string Normalize(string value) =>
        string.Join("_", value.Trim().ToUpperInvariant().Split(new[] { ' ', '-', '/', '\\', '.' }, StringSplitOptions.RemoveEmptyEntries));
}
