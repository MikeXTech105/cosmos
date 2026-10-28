using System.Text;
using Cosmos.API.Controllers.Manufacturing;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionOperationalCsvTests
{
    [Fact]
    public async Task Csv_exports_all_pages_exact_quantities_filter_basis_quality_flags_and_unit_totals()
    {
        var service = new Mock<IProductionWorkspaceService>();
        ProductionOperationalReportRow Row(long id) => new(id, "ProductionOrder", new(2026, 10, 28), 9, 2, null,
            10.000001m, null, null, null, null, null, null, null, null, "Historical unit evidence unavailable")
            { ItemName = "=HYPERLINK(\"bad\")", ItemCode = "ITEM-9", UnitName = "PCS" };
        service.Setup(x => x.OperationalReportAsync("ledger", It.IsAny<ProductionWorkspaceQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string _, ProductionWorkspaceQuery q, CancellationToken _) => ApiResponse<PagedResult<ProductionOperationalReportRow>>.Success(
                new([Row(q.PageNumber)], q.PageNumber, 1, 2, new { quantityTotals = new[] { new { unitName = "PCS", goodOutput = 20.000002m } } })));
        var context = new DefaultHttpContext();
        await using var body = new MemoryStream(); context.Response.Body = body;
        var controller = new ProductionOperationalReportsController(service.Object) { ControllerContext = new ControllerContext { HttpContext = context } };
        await controller.Export("ledger", new ProductionWorkspaceQuery(FromDate: new(2026, 10, 1)), default, "csv");
        var text = Encoding.UTF8.GetString(body.ToArray());
        Assert.Equal("text/csv; charset=utf-8", context.Response.ContentType);
        Assert.Contains("\"Accepted output\"", text);
        Assert.Contains("20.000002", text); Assert.Contains("10.000001", text);
        Assert.Contains("Historical unit evidence unavailable", text);
        Assert.Contains("'" + "=HYPERLINK", text);
        Assert.Equal(2, text.Split("\"Data\"").Length - 1);
        Assert.Contains("\"Unit total\"", text);
        Assert.Contains("from 2026-10-01", text);
        service.Verify(x => x.OperationalReportAsync("ledger", It.Is<ProductionWorkspaceQuery>(q => q.PageNumber == 2), It.IsAny<CancellationToken>()), Times.Once);
    }
}

