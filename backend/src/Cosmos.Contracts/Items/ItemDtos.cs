namespace Cosmos.Contracts.Items;

public sealed record ItemDto(
    long Id,
    string Name,
    string ItemCode,
    string? Barcode,
    long CategoryId,
    string CategoryName,
    long UnitId,
    string UnitName,
    string UnitShortName,
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
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    bool IsDeleted)
{
    // Lets Dapper materialize older deployed Item procedures that do not yet return IsManufactured.
    public ItemDto() : this(0, string.Empty, string.Empty, null, 0, string.Empty, 0, string.Empty, string.Empty, 0, null, 0, 0, null, 0, false, false, 0, 0, 0, 0, 0, null, null, false, default, null, null, null, false) { }
}

public sealed record ItemListItemDto(
    long Id,
    string Name,
    string ItemCode,
    string? Barcode,
    long CategoryId,
    string CategoryName,
    long UnitId,
    string UnitName,
    string UnitShortName,
    int ItemType,
    int? ProcurementClassification,
    decimal SalesPrice,
    decimal PurchasePrice,
    decimal CurrentStock,
    decimal ReservedStock,
    decimal MinimumStock,
    bool TrackInventory,
    bool IsManufactured,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? ModifiedAt,
    int TotalCount)
{
    // Existing SQL installations may not have applied the IsManufactured migration yet.
    public ItemListItemDto() : this(0, string.Empty, string.Empty, null, 0, string.Empty, 0, string.Empty, string.Empty, 0, null, 0, 0, 0, 0, 0, false, false, false, default, null, 0) { }
}

public sealed record ItemListSummaryDto(int TotalCount, int ProductCount, int ServiceCount, int LowStockCount);

public sealed record CategoryDto(
    long Id,
    string Name,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    bool IsDeleted);

public sealed record CategoryListItemDto(
    long Id,
    string Name,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? ModifiedAt,
    int TotalCount);

public sealed record MasterListSummaryDto(int TotalCount, int ActiveCount, int InactiveCount);

public sealed record UnitDto(
    long Id,
    string Name,
    string ShortName,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? ModifiedAt,
    long? ModifiedBy,
    bool IsDeleted);

public sealed record UnitListItemDto(
    long Id,
    string Name,
    string ShortName,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? ModifiedAt,
    int TotalCount);
