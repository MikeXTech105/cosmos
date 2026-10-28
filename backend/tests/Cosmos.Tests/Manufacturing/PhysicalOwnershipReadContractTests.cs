using System.Reflection;
using Cosmos.API.Controllers.Manufacturing;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Cosmos.Tests.Manufacturing;

public sealed class PhysicalOwnershipReadContractTests
{
    [Fact]
    public async Task Procurement_recovery_reads_persisted_source_links_and_requires_both_view_permissions()
    {
        var service = new Mock<IPhysicalInventoryService>(MockBehavior.Strict);
        var context = new ProcurementPurchaseSourceContext(10, [new(42, 7, "PO-000007", 51, 6, 3, 0.000001m, 1, "Quoted Q-77")]);
        service.Setup(x => x.PurchaseSourcesAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse<ProcurementPurchaseSourceContext>.Success(context));
        var controller = new ProcurementContinuityController(service.Object) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        var result = Assert.IsType<ObjectResult>(await controller.PurchaseSources(10, CancellationToken.None));
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
        Assert.Same(context, Assert.IsType<ApiResponse<ProcurementPurchaseSourceContext>>(result.Value).Data);
        service.VerifyAll();
        var permissions = typeof(ProcurementContinuityController).GetMethod(nameof(ProcurementContinuityController.PurchaseSources))!.GetCustomAttributes<RequirePermissionAttribute>().ToArray();
        Assert.Equal(2, permissions.Length);
        Assert.Contains(permissions, x => Equals(x.Arguments![0], ProcurementPlanningPermissions.PlanningHistory) && Equals(x.Arguments[1], PermissionAction.View));
        Assert.Contains(permissions, x => Equals(x.Arguments![0], "PurchaseExpense.PurchaseOrder") && Equals(x.Arguments[1], PermissionAction.View));
    }

    [Fact]
    public async Task Packing_context_reads_only_packing_data_without_requiring_invoice_permission()
    {
        var service = new Mock<IPhysicalInventoryService>(MockBehavior.Strict);
        var snapshot = new PhysicalOwnershipSnapshot(71, "0x0000000000000010", [new(null, 8, 6, null, 0.000001m, null) { PackagingProfileId = 15, UnitsPerBox = 12m }]);
        service.Setup(x => x.ReadAsync(71, "packing", It.IsAny<CancellationToken>())).ReturnsAsync(ApiResponse<PhysicalOwnershipSnapshot>.Success(snapshot));
        var controller = new ShipmentInvoiceOwnershipController(service.Object);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        var result = Assert.IsType<ObjectResult>(await controller.PackingContext(71, CancellationToken.None));
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
        Assert.Same(snapshot, Assert.IsType<ApiResponse<PhysicalOwnershipSnapshot>>(result.Value).Data);
        service.VerifyAll();
        var permissions = typeof(ShipmentInvoiceOwnershipController).GetMethod(nameof(ShipmentInvoiceOwnershipController.PackingContext))!.GetCustomAttributes<RequirePermissionAttribute>().ToArray();
        var permission = Assert.Single(permissions);
        Assert.Equal(ShipmentOperationsPermissions.Shipments, permission.Arguments![0]);
        Assert.Equal(PermissionAction.View, permission.Arguments[1]);
    }

    [Fact]
    public void Invoice_link_reads_still_require_both_invoice_and_shipment_view()
    {
        var permissions = typeof(ShipmentInvoiceOwnershipController).GetMethod(nameof(ShipmentInvoiceOwnershipController.Get))!.GetCustomAttributes<RequirePermissionAttribute>().ToArray();
        Assert.Equal(2, permissions.Length);
        Assert.Contains(permissions, x => Equals(x.Arguments![0], "Sales.Invoice") && Equals(x.Arguments[1], PermissionAction.View));
        Assert.Contains(permissions, x => Equals(x.Arguments![0], ShipmentOperationsPermissions.Shipments) && Equals(x.Arguments[1], PermissionAction.View));
    }
}
