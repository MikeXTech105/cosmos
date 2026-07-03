namespace Cosmos.Domain.Entities;

public sealed class Item
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ItemCode { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public long CategoryId { get; set; }
    public long UnitId { get; set; }
    public int ItemType { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SalesPrice { get; set; }
    public string? HSNCode { get; set; }
    public decimal GSTRate { get; set; }
    public bool TrackInventory { get; set; }
    public decimal OpeningStock { get; set; }
    public decimal OpeningStockValue { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal ReservedStock { get; set; }
    public decimal MinimumStock { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public long? ModifiedBy { get; set; }
    public bool IsDeleted { get; set; }
}
