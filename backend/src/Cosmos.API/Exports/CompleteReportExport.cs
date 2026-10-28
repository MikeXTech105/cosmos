using System.Security.Cryptography;
using System.Text.Json;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;

namespace Cosmos.API.Exports;

/// <summary>Verifies a complete, stable paged source before publishing any CSV bytes.</summary>
internal static class CompleteReportExport
{
    public const int PageSize = 200;
    public static async Task<IReadOnlyCollection<T>> ReadAsync<T>(
        Func<int, CancellationToken, Task<ApiResponse<PagedResult<T>>>> read, CancellationToken ct)
    {
        var rows = new List<T>();
        var pageHashes = new HashSet<string>(StringComparer.Ordinal);
        int? expectedTotal = null;
        for (var number = 1; ; number++)
        {
            ct.ThrowIfCancellationRequested();
            var response = await read(number, ct);
            ct.ThrowIfCancellationRequested();
            var page = response.Succeeded ? response.Data : null;
            if (page is null || page.PageNumber != number || page.PageSize != PageSize || page.TotalCount < 0)
                throw Incomplete();
            expectedTotal ??= page.TotalCount;
            if (page.TotalCount != expectedTotal || page.Items is null ||
                page.Items.Count != Math.Min(PageSize, expectedTotal.Value - rows.Count))
                throw Incomplete();
            if (page.Items.Count > 0)
            {
                // A backend returning page one repeatedly must never publish a plausible partial export.
                var hash = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(page.Items)));
                if (!pageHashes.Add(hash)) throw Incomplete();
                rows.AddRange(page.Items);
            }
            if (rows.Count == expectedTotal) return rows;
        }
    }
    private static CosmosException Incomplete() => new("The report changed or returned an incomplete/repeated page. Refresh the filters and retry the export; no partial file was published.", 409);
}
