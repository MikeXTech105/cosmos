using System.Reflection;
using Cosmos.API.Controllers;
using Cosmos.API.Security;
using Cosmos.Domain.Security;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.Tests.Gst;

public sealed class GstInvoiceEligibilityControllerTests
{
    [Fact]
    public void EligibilityRoute_RequiresBothGstAndSalesReadPermissions()
    {
        var method = typeof(GstInvoiceEligibilityController).GetMethod(nameof(GstInvoiceEligibilityController.GetEligibility), BindingFlags.Instance | BindingFlags.Public)!;
        var permissions = method.GetCustomAttributes<RequirePermissionAttribute>().Select(attribute => attribute.Arguments).ToArray();

        Assert.Contains(permissions, arguments => (string)arguments![0] == GstPermissions.EInvoice && (PermissionAction)arguments[1] == PermissionAction.View);
        Assert.Contains(permissions, arguments => (string)arguments![0] == "Sales.Invoice" && (PermissionAction)arguments[1] == PermissionAction.View);
    }

    [Fact]
    public void EligibilityRoute_RejectsNonPositiveInvoiceIdsAtRouting()
    {
        var method = typeof(GstInvoiceEligibilityController).GetMethod(nameof(GstInvoiceEligibilityController.GetEligibility), BindingFlags.Instance | BindingFlags.Public)!;
        var route = method.GetCustomAttribute<HttpGetAttribute>()!;

        Assert.Equal("{salesInvoiceId:long:min(1)}/eligibility", route.Template);
    }
}
