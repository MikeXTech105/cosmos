using Cosmos.Application.Gst;
using Cosmos.Contracts.Sales;

namespace Cosmos.Tests.Gst;

public sealed class GstComplianceSnapshotReadinessTests
{
    [Fact]
    public void ConfirmedInvoiceWithoutHistoricalComplianceBindings_IsNotSnapshotEligible()
    {
        var invoice = new SalesInvoiceDetailDto
        {
            Id = 42,
            Status = 2,
            Items = [new SalesInvoiceItemDto { HsnSacCodeSnapshot = "8471", Quantity = 1, LineTotal = 118m }]
        };

        var result = GstComplianceSnapshotReadinessEvaluator.Evaluate(invoice);

        Assert.False(result.CanCreateSnapshot);
        Assert.DoesNotContain(result.Issues, x => x.Code == "GST_SNAPSHOT_INVOICE_NOT_CONFIRMED");
        Assert.Contains(result.Issues, x => x.Code == "GST_SNAPSHOT_SELLER_REGISTRATION_UNRESOLVED");
        Assert.Contains(result.Issues, x => x.Code == "GST_SNAPSHOT_TAX_COMPONENTS_UNSNAPSHOTTED");
    }

    [Fact]
    public void DraftInvoiceAndMissingHsn_AreReportedWithoutReadingCurrentMasterData()
    {
        var result = GstComplianceSnapshotReadinessEvaluator.Evaluate(new SalesInvoiceDetailDto
        {
            Id = 43,
            Status = 1,
            Items = [new SalesInvoiceItemDto { Quantity = 1, LineTotal = 1m }]
        });

        Assert.Contains(result.Issues, x => x.Code == "GST_SNAPSHOT_INVOICE_NOT_CONFIRMED");
        Assert.Contains(result.Issues, x => x.Code == "GST_SNAPSHOT_HSN_SAC_MISSING");
    }
}
