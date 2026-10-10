using Cosmos.Application.ProcurementPlanning;
using Cosmos.Application.Services;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.ProcurementPlanning;

public sealed class ProcurementPolicyTests
{
    [Fact]
    public void SalesSummary_AggregatesThreeChannelsAndAddsFutureConfiguredChannel()
    {
        var channels = new[]
        {
            new SalesSummaryChannelDto(1,"AMZ","Amazon",10),
            new SalesSummaryChannelDto(2,"BLI","Blinkit",20),
            new SalesSummaryChannelDto(3,"INS","Instamart",30),
            new SalesSummaryChannelDto(4,"D2C","Direct Store",40)
        };
        var rows = new[]
        {
            new SalesSummaryFlatRow(10,"FP-10","Product",1,"AMZ",2m),
            new SalesSummaryFlatRow(10,"FP-10","Product",2,"BLI",3m),
            new SalesSummaryFlatRow(10,"FP-10","Product",3,"INS",5m),
            new SalesSummaryFlatRow(10,"FP-10","Product",4,"D2C",7m)
        };

        var summary = ProcurementSalesSummaryBuilder.Build(new DateOnly(2026,6,1), new DateOnly(2026,6,30), channels, rows);
        var product = Assert.Single(summary.Products);
        Assert.Equal(17m, product.TotalQuantity);
        Assert.Equal(2m, product.ChannelQuantities["AMZ"]);
        Assert.Equal(3m, product.ChannelQuantities["BLI"]);
        Assert.Equal(5m, product.ChannelQuantities["INS"]);
        Assert.Equal(7m, product.ChannelQuantities["D2C"]);
    }

    [Fact]
    public void ImportPolicy_BlocksDuplicateUnlessIntentionalCorrectionHasReason()
    {
        var preview = Preview(duplicate: true);
        var conflict = Assert.Throws<CosmosException>(() => ProcurementSalesImportPolicy.ValidateConfirmation(preview, false, null));
        Assert.Equal(409, conflict.StatusCode);
        Assert.Throws<CosmosException>(() => ProcurementSalesImportPolicy.ValidateConfirmation(preview, true, " "));
        ProcurementSalesImportPolicy.ValidateConfirmation(preview, true, "Correcting source dates");
    }

    [Fact]
    public void ImportPolicy_BlocksAnyInvalidRow()
    {
        var row = new SalesImportRowPreviewDto(2, null, "AMZ", "SKU", null, 1m, 1, null, null, null, ["SalesDate is invalid."]);
        var preview = new SalesImportPreviewDto("sales.csv","hash",1,0,1,0,false,[row]);
        var exception = Assert.Throws<CosmosException>(() => ProcurementSalesImportPolicy.ValidateConfirmation(preview, false, null));
        Assert.Equal(400, exception.StatusCode);
    }

    private static SalesImportPreviewDto Preview(bool duplicate)
    {
        var row = new SalesImportRowPreviewDto(2, new DateOnly(2026,6,30), "AMZ", "SKU", "Product", 1m, 1, 10, "FP-10", "Product", []);
        return new SalesImportPreviewDto("sales.csv","hash",1,1,0,0,duplicate,[row]);
    }
}
