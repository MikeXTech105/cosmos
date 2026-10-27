using Cosmos.API.Controllers.Manufacturing;
using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Configuration;
using System.Reflection;
using System.Security.Claims;

namespace Cosmos.Tests.Manufacturing;

public sealed class ProductionApiContractTests
{
    [Fact]
    public void Every_workspace_action_has_a_concrete_Swagger_response_and_permission()
    {
        var controllers = new[] { typeof(ManufacturingBomsController),typeof(ManufacturingProductionsController),typeof(ProductionConfigurationController), typeof(ProductionOrdersController), typeof(ProductionPlanningReportsController), typeof(InvoiceInventoryOwnershipController), typeof(ShipmentInvoiceOwnershipController), typeof(ProductionImportsController), typeof(PurchasePhysicalController), typeof(PurchaseReceiptBillingController), typeof(ProductionBomEffectivityController),typeof(ProcurementContinuityController),typeof(PurchaseSupplierPerformanceController),typeof(ProductionSnapshotsController),typeof(ProductionStockAdjustmentsController),typeof(PackagingConversionController) };
        foreach (var controller in controllers)
        foreach (var method in controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
        {
            Assert.NotEmpty(method.GetCustomAttributes<RequirePermissionAttribute>());
            var response = Assert.Single(method.GetCustomAttributes<ProducesResponseTypeAttribute>());
            Assert.NotNull(response.Type); Assert.NotEqual(typeof(void), response.Type);
        }
    }
    [Theory]
    [InlineData("Release")]
    [InlineData("Complete")]
    [InlineData("Close")]
    [InlineData("Cancel")]
    [InlineData("Reverse")]
    public void Stock_sensitive_order_commands_require_Approve(string name)
    {
        var permission = Assert.Single(typeof(ProductionOrdersController).GetMethod(name)!.GetCustomAttributes<RequirePermissionAttribute>());
        Assert.Equal(ManufacturingPermissions.Orders, permission.Arguments![0]);
        Assert.Equal(PermissionAction.Approve, permission.Arguments[1]);
    }
    [Fact]
    public void Catalog_company_scope_fails_closed_and_rejects_cross_company_claims()
    {
        var accessor = new HttpContextAccessor { HttpContext = new DefaultHttpContext() };
        var empty = new ConfigurationBuilder().Build();
        Assert.Throws<ForbiddenCosmosException>(() => new ProductionCompanyScope(empty, accessor).CompanyKey);
        var configured = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Manufacturing:CatalogCompanyKey"] = "company-a" }).Build();
        Assert.Throws<ForbiddenCosmosException>(() => new ProductionCompanyScope(configured, accessor).CompanyKey);
        accessor.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("CompanyKey", "company-a")], "test"));
        Assert.Equal("company-a", new ProductionCompanyScope(configured, accessor).CompanyKey);
        accessor.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("CompanyKey", "company-b")], "test"));
        Assert.Throws<ForbiddenCosmosException>(() => new ProductionCompanyScope(configured, accessor).CompanyKey);
    }
}
