using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Services;

internal static class ProcurementSalesImportPolicy
{
    public static void ValidateConfirmation(SalesImportPreviewDto preview, bool allowDuplicate, string? correctionReason)
    {
        if (preview.InvalidRows > 0)
            throw new CosmosException("Sales import contains validation errors.", 400, preview.Rows.Where(x => !x.IsValid).SelectMany(x => x.Errors.Select(e => $"Row {x.RowNumber}: {e}")));
        if (preview.DuplicateFile && !allowDuplicate)
            throw new CosmosException("This file was already imported. Set AllowDuplicate=true with a correction reason only for an intentional correction.", 409);
        if (allowDuplicate && string.IsNullOrWhiteSpace(correctionReason))
            throw new CosmosException("CorrectionReason is required when AllowDuplicate is true.");
    }
}

internal static class ProcurementSalesSummaryBuilder
{
    public static ProductSalesSummaryDto Build(
        DateOnly fromDate,
        DateOnly toDate,
        IReadOnlyCollection<SalesSummaryChannelDto> channels,
        IReadOnlyCollection<SalesSummaryFlatRow> flatRows)
    {
        var products = flatRows.GroupBy(x => new { x.ItemId, x.ItemCode, x.ItemName }).Select(group =>
        {
            var values = channels.ToDictionary(x => x.Code, _ => 0m, StringComparer.OrdinalIgnoreCase);
            foreach (var value in group) values[value.ChannelCode] = value.Quantity;
            return new ProductSalesSummaryRowDto(group.Key.ItemId, group.Key.ItemCode, group.Key.ItemName, values, values.Values.Sum());
        }).OrderBy(x => x.ItemName).ToArray();

        return new ProductSalesSummaryDto(fromDate, toDate, toDate.DayNumber - fromDate.DayNumber + 1, channels, products);
    }
}
