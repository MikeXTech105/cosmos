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
    bool IsDeleted);

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
    bool IsActive,
    DateTime CreatedAt,
    DateTime? ModifiedAt,
    int TotalCount);

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
