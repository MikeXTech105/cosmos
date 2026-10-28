using System.Text;
using Cosmos.API.Controllers.DispatchPlanning;
using Cosmos.API.Controllers.ShipmentOperations;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.ShipmentOperations;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Cosmos.Tests.ShipmentOperations;

public sealed class CompleteOperationsReportExportTests
{
    private static ShipmentReportRowDto ShipmentRow(int id) => new($"SHIP-{id:D5}", new(2026,10,28), "CHANNEL", "WAREHOUSE", "ITEM", "Exact quantity", 1234567890123.000001m, 0, 0, 0, ShipmentStatus.Draft, null, 0, 601);
    [Fact]
    public async Task Shipment_export_includes_last_row_beyond_500_with_exact_quantity_and_all_original_filters()
    {
        var service = new Mock<IShipmentOperationsService>();
        var query = new ShipmentReportQuery(17, 31, ShipmentStatus.Draft, new(2026,10,1), new(2026,10,28), 7, 10);
        var calls = new List<ShipmentReportQuery>();
        service.Setup(x=>x.GetReportAsync(It.IsAny<ShipmentReportQuery>(),It.IsAny<CancellationToken>())).ReturnsAsync((ShipmentReportQuery q,CancellationToken _) =>
        {
            calls.Add(q);
            return ApiResponse<PagedResult<ShipmentReportRowDto>>.Success(new(Enumerable.Range(1,601).Skip((q.PageNumber-1)*q.PageSize).Take(q.PageSize).Select(ShipmentRow).ToArray(),q.PageNumber,q.PageSize,601));
        });
        var result=Assert.IsType<FileContentResult>(await new ShipmentReportsController(service.Object).Export(query,default));
        var csv=Encoding.UTF8.GetString(result.FileContents);
        Assert.Contains("\"SHIP-00601\"",csv); Assert.Contains("1234567890123.000001",csv);
        Assert.Equal(601,csv.Split("\"Exact quantity\"").Length-1);
        Assert.DoesNotContain("Unit total",csv);
        Assert.Equal(new[]{1,2,3,4},calls.Select(q=>q.PageNumber));
        Assert.All(calls,q=>Assert.Equal(query with {PageNumber=q.PageNumber,PageSize=200},q));
    }
    [Fact]
    public async Task Dispatch_export_includes_all_601_rows_and_preserves_period_warehouse_status()
    {
        var service=new Mock<IDispatchPlanningService>();
        var query=new DispatchRecommendationReportQuery(17,31,new(2026,10,1),new(2026,10,28),4,8,10);
        var calls=new List<DispatchRecommendationReportQuery>();
        service.Setup(x=>x.GetRecommendationReportAsync(It.IsAny<DispatchRecommendationReportQuery>(),It.IsAny<CancellationToken>())).ReturnsAsync((DispatchRecommendationReportQuery q,CancellationToken _) =>
        {
            calls.Add(q);
            var rows=Enumerable.Range(1,601).Skip((q.PageNumber-1)*q.PageSize).Take(q.PageSize).Select(id=>new DispatchRecommendationReportRowDto($"RUN-{id:D5}",new(2026,10,28),"CHANNEL","WH","Destination","ITEM","Exact recommendation","SKU",1,5.000001m,0,0,4,601)).ToArray();
            return ApiResponse<PagedResult<DispatchRecommendationReportRowDto>>.Success(new(rows,q.PageNumber,q.PageSize,601));
        });
        var result=Assert.IsType<FileContentResult>(await new DispatchPlanningReportsController(service.Object).ExportRecommendations(query,default));
        var csv=Encoding.UTF8.GetString(result.FileContents);
        Assert.Contains("\"RUN-00601\"",csv); Assert.Contains("5.000001",csv);
        Assert.Equal(601,csv.Split("\"Exact recommendation\"").Length-1);
        Assert.DoesNotContain("Unit total",csv);
        Assert.Equal(4,calls.Count); Assert.All(calls,q=>Assert.Equal(query with {PageNumber=q.PageNumber,PageSize=200},q));
    }
    [Theory]
    [InlineData("repeated")]
    [InlineData("short")]
    [InlineData("changed")]
    [InlineData("failure")]
    public async Task Export_refuses_repeated_partial_changing_or_failed_source_without_returning_partial_file(string failure)
    {
        var service=new Mock<IShipmentOperationsService>();
        service.Setup(x=>x.GetReportAsync(It.IsAny<ShipmentReportQuery>(),It.IsAny<CancellationToken>())).ReturnsAsync((ShipmentReportQuery q,CancellationToken _) =>
        {
            if(q.PageNumber>1 && failure=="failure") return ApiResponse<PagedResult<ShipmentReportRowDto>>.Failure("source unavailable");
            var count=q.PageNumber>1 && failure=="short"?0:200;
            var start=q.PageNumber>1 && failure!="repeated"?201:1;
            return ApiResponse<PagedResult<ShipmentReportRowDto>>.Success(new(Enumerable.Range(start,count).Select(ShipmentRow).ToArray(),q.PageNumber,q.PageSize,q.PageNumber>1 && failure=="changed"?401:400));
        });
        var error=await Assert.ThrowsAsync<CosmosException>(()=>new ShipmentReportsController(service.Object).Export(new(),default));
        Assert.Equal(409,error.StatusCode); Assert.Contains("no partial file",error.Message);
    }
    [Fact]
    public async Task Export_observes_cancellation_before_requesting_another_page()
    {
        using var cancellation=new CancellationTokenSource();
        var service=new Mock<IShipmentOperationsService>();
        service.Setup(x=>x.GetReportAsync(It.IsAny<ShipmentReportQuery>(),cancellation.Token)).ReturnsAsync((ShipmentReportQuery q,CancellationToken _) =>
        {
            cancellation.Cancel();
            return ApiResponse<PagedResult<ShipmentReportRowDto>>.Success(new(Enumerable.Range(1,200).Select(ShipmentRow).ToArray(),q.PageNumber,q.PageSize,400));
        });
        await Assert.ThrowsAnyAsync<OperationCanceledException>(()=>new ShipmentReportsController(service.Object).Export(new(),cancellation.Token));
        service.Verify(x=>x.GetReportAsync(It.IsAny<ShipmentReportQuery>(),It.IsAny<CancellationToken>()),Times.Once);
    }
}
