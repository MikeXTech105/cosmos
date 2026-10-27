using System.Text.Json;
using Cosmos.API.Controllers.Manufacturing;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionFrontendContractTests
{
    [Fact]
    public void Object_valued_SQL_summary_retains_its_provider_alias_casing_in_the_real_envelope()
    {
        using var summary = JsonDocument.Parse("""{"QuantityTotals":[{"UnitId":7,"GoodOutput":0.000001}],"DataQualityRows":1}""");
        var page = new PagedResult<object>([], 1, 50, 101, summary.RootElement.Clone());
        var json = JsonSerializer.Serialize(ApiResponse<PagedResult<object>>.Success(page), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var serialized = JsonDocument.Parse(json);
        var actual = serialized.RootElement.GetProperty("data").GetProperty("summary");
        Assert.Equal(0.000001m, actual.GetProperty("QuantityTotals")[0].GetProperty("GoodOutput").GetDecimal());
        Assert.False(actual.TryGetProperty("quantityTotals", out _));
    }
    [Fact]
    public void Context_JSON_retains_amendment_baselines_and_unknown_purchase_remainder()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var material = JsonSerializer.Deserialize<ProductionMaterialSnapshot>("""{"id":1,"itemId":2,"unitId":3,"quantityPerOutput":0.1,"wastePercent":0,"requiredQuantity":10,"consumedQuantity":3,"sourceComponentQuantity":1,"outputBaseQuantity":10,"baselineOutputQuantity":30.000001,"baselineExpectedQuantity":3.000001}""", options)!;
        Assert.Equal(30.000001m, material.BaselineOutputQuantity);
        Assert.Equal(3.000001m, material.BaselineExpectedQuantity);
        var purchase = JsonSerializer.Deserialize<PurchaseFollowupLine>("""{"purchaseOrderId":1,"purchaseOrderNo":"PO-test","supplierId":"00000000-0000-0000-0000-000000000001","purchaseOrderLineId":2,"itemId":3,"unitId":4,"orderDate":"2026-10-27","orderedQuantity":10,"acceptedQuantity":11,"pendingQuantity":null,"isOverdue":false}""", options)!;
        Assert.Null(purchase.PendingQuantity);
        Assert.Contains("\"pendingQuantity\":null", JsonSerializer.Serialize(purchase, options));
    }
    [Fact]
    public async Task Calendar_context_uses_explicit_dated_read_and_preserves_offsets_and_version()
    {
        var service = new Mock<IProductionWorkspaceService>(MockBehavior.Strict);
        var date = new DateOnly(2026, 10, 27);
        var data = new CapacityCalendarContextDto(17, "0x0000000000000017", date,
            [new(DateTimeOffset.Parse("2026-10-27T23:45:00+05:30"), DateTimeOffset.Parse("2026-10-28T00:15:00+05:30"), "Approved break")], []);
        service.Setup(x => x.CalendarContextAsync(17, date, It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse<CapacityCalendarContextDto>.Success(data));
        var controller = new ProductionConfigurationController(service.Object) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        var result = Assert.IsType<ObjectResult>(await controller.CalendarContext(17, date, CancellationToken.None));
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
        Assert.Same(data, Assert.IsType<ApiResponse<CapacityCalendarContextDto>>(result.Value).Data);
        service.VerifyAll();
    }
    [Fact]
    public void Runtime_uses_verified_company_business_day_and_exposes_browser_timezone_without_SQL()
    {
        var scope = new Mock<IProductionCompanyScope>(MockBehavior.Strict);
        scope.SetupGet(x => x.CompanyKey).Returns("test-only");
        scope.SetupGet(x => x.BusinessTimeZone).Returns("India Standard Time");
        scope.SetupGet(x => x.CurrentBusinessDate).Returns(new DateOnly(2026, 10, 28));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Manufacturing:ClosedThroughDate"] = "2026-10-26" }).Build();
        var result = Assert.IsType<OkObjectResult>(new ProductionRuntimeController(scope.Object, config).Get());
        var value = Assert.IsType<ApiResponse<ProductionRuntimeDto>>(result.Value).Data!;
        Assert.Equal(new DateOnly(2026, 10, 28), value.BusinessDate);
        Assert.Contains(value.BrowserTimeZone, new[] { "Asia/Calcutta", "Asia/Kolkata" });
        Assert.Equal(new DateOnly(2026, 10, 26), value.ClosedThroughDate);
        scope.VerifyGet(x => x.CompanyKey, Times.Once);
    }

    [Fact]
    public void Raw_numeric_JSON_contract_preserves_all_posting_digits_and_long_id()
    {
        const string raw = """{"version":"0x0000000000000001","idempotencyKey":"precision-test","businessDate":"2026-10-27","unitId":9223372036854775807,"signedQuantity":9999999999999999.999999,"reason":"Exact quantity","sourceReference":"synthetic"}""";
        var result = JsonSerializer.Deserialize<StockAdjustmentRequest>(raw, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal(9999999999999999.999999m, result.SignedQuantity);
        Assert.Equal(long.MaxValue, result.UnitId);
        var output = JsonSerializer.Serialize(result, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Contains("9999999999999999.999999", output);
        Assert.Contains("9223372036854775807", output);
    }
}
