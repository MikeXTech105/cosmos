namespace Cosmos.Application.Items.Commands;

public sealed record UpdateItemCommand(
    string Name,
    string ItemCode,
    string? Barcode,
    long CategoryId,
    long UnitId,
    int ItemType,
    int? ProcurementClassification,
    decimal PurchasePrice,
    decimal SalesPrice,
    string? HSNCode,
    decimal GSTRate,
    bool TrackInventory,
    bool IsManufactured,
    decimal OpeningStock,
    decimal OpeningStockValue,
    decimal CurrentStock,
    decimal ReservedStock,
    decimal MinimumStock,
    string? Description,
    string? ImageUrl,
    bool IsActive);
