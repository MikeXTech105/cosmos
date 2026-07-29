namespace Cosmos.Domain.ShipmentOperations;

// Focused domain shapes. Persistence remains Dapper/stored-procedure based in this solution.
public sealed class Shipment
{
    public long Id { get; set; }
    public string ShipmentNumber { get; set; } = string.Empty;
    public long ChannelId { get; set; }
    public long WarehouseId { get; set; }
    public long? DispatchPlanningRunId { get; set; }
    public ShipmentSourceType SourceType { get; set; }
    public ShipmentStatus Status { get; set; }
    public DateOnly ShipmentDate { get; set; }
    public Guid? TransporterPartyId { get; set; }
    public decimal TotalPlannedQuantity { get; set; }
    public decimal TotalPackedQuantity { get; set; }
    public decimal TotalDispatchedQuantity { get; set; }
    public decimal TotalReceivedQuantity { get; set; }
    public decimal TotalReturnedQuantity { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

public sealed class ShipmentItem
{
    public long Id { get; set; }
    public long ShipmentId { get; set; }
    public long ItemId { get; set; }
    public long? DispatchPlanningAllocationId { get; set; }
    public decimal PlannedQuantity { get; set; }
    public decimal PackedQuantity { get; set; }
    public decimal DispatchedQuantity { get; set; }
    public decimal ReceivedQuantity { get; set; }
    public decimal ReturnedQuantity { get; set; }
}

public sealed class ShipmentPackage
{
    public long Id { get; set; }
    public long ShipmentId { get; set; }
    public string PackageNumber { get; set; } = string.Empty;
    public decimal GrossWeight { get; set; }
    public decimal VolumetricWeight { get; set; }
    public decimal ChargeableWeight { get; set; }
}
