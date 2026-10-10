namespace Cosmos.Domain.SupplyChain;

public enum SupplyChainImportStatus
{
    Uploaded = 1,
    Validating = 2,
    Validated = 3,
    ValidationFailed = 4,
    Committed = 5,
    Cancelled = 6
}

public enum SupplyChainImportType
{
    ProcurementSales = 1,
    ProcurementStock = 2,
    ProcurementInbound = 3,
    WarehouseSales = 4,
    WarehouseStock = 5,
    WarehouseInbound = 6,
    ShipmentDocket = 7,
    ShipmentTracking = 8,
    FreightCharges = 9
}
