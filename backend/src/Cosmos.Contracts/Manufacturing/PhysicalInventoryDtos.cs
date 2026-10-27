namespace Cosmos.Contracts.Manufacturing;

public sealed record ShipmentPackingVerificationLine(long ShipmentItemId,long UnitId,long PackagingProfileId);
public sealed record ShipmentPackingVerificationRequest(string Version,string IdempotencyKey,string Reason,
    IReadOnlyCollection<ShipmentPackingVerificationLine> Lines);

public enum InvoiceInventoryOwner { StandaloneInvoice = 1, Shipment = 2 }
public sealed record InvoiceLineOwnership(long InvoiceLineId, InvoiceInventoryOwner Owner);
public sealed record InvoiceOwnershipRequest(string Version, string IdempotencyKey, IReadOnlyCollection<InvoiceLineOwnership> Lines);
public sealed record ShipmentInvoiceLineLink(long ShipmentItemId, long InvoiceLineId, decimal Quantity);
public sealed record ShipmentInvoiceLinkRequest(string Version, string IdempotencyKey, IReadOnlyCollection<ShipmentInvoiceLineLink> Lines);
public sealed record PhysicalOwnershipLine(long? InvoiceLineId, long? ShipmentItemId, long ItemId, long? UnitId,
    decimal Quantity, InvoiceInventoryOwner? Owner)
{
    public long? InvoiceId { get; init; }
    public string? InvoiceNumber { get; init; }
    public string? ItemName { get; init; }
    public string? UnitName { get; init; }
    public long? PackagingProfileId { get; init; }
    public decimal? UnitsPerBox { get; init; }
}
public sealed record PhysicalOwnershipSnapshot(long Id, string Version, IReadOnlyCollection<PhysicalOwnershipLine> Lines);
