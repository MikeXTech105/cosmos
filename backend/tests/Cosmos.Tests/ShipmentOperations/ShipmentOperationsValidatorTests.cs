using Cosmos.Application.Validators;
using Cosmos.Contracts.ShipmentOperations;
using Cosmos.Domain.ShipmentOperations;

namespace Cosmos.Tests.ShipmentOperations;

public sealed class ShipmentOperationsValidatorTests
{
    [Fact]
    public async Task ManualShipment_RequiresReasonAndUniquePositiveItems()
    {
        var validator = new CreateManualShipmentRequestValidator();
        var result = await validator.ValidateAsync(new CreateManualShipmentRequest(1, 2, new DateOnly(2026, 7, 29),
        [
            new CreateShipmentItemRequest(3, 1),
            new CreateShipmentItemRequest(3, 0)
        ], ManualReason: ""));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == "ManualReason");
        Assert.Contains(result.Errors, x => x.PropertyName.Contains("Items", StringComparison.Ordinal));
    }

    [Fact]
    public async Task PackageValidator_RejectsUnmarkedMixedPackageAndInvalidWeight()
    {
        var validator = new SaveShipmentPackageRequestValidator();
        var result = await validator.ValidateAsync(new SaveShipmentPackageRequest("BOX-1", "Carton",
        [
            new SaveShipmentPackageItemRequest(1, 1),
            new SaveShipmentPackageItemRequest(2, 1)
        ], GrossWeight: 1, NetWeight: 2, IsMixedPackage: false));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == "NetWeight");
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("mixed", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task ReceiptValidator_RequiresAnOutcomeQuantity()
    {
        var validator = new CreateShipmentReceiptRequestValidator();
        var result = await validator.ValidateAsync(new CreateShipmentReceiptRequest(new DateOnly(2026, 7, 29),
        [
            new CreateShipmentReceiptItemRequest(1, 0, 0, 0, 0)
        ]));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.ErrorMessage.Contains("greater than zero", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task HistoricalImport_RejectsInvalidStatusAndQuantity()
    {
        var validator = new ShipmentHistoricalImportRowRequestValidator();
        var result = await validator.ValidateAsync(new ShipmentHistoricalImportRowRequest(1, null, "AMZ", "WH-1", "SKU-1", 0, new DateOnly(2026, 7, 29), (ShipmentStatus)99));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == "Quantity");
        Assert.Contains(result.Errors, x => x.PropertyName == "Status");
    }
}
