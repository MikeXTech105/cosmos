namespace Cosmos.Domain.Items;

public enum ItemType
{
    Product = 1,
    Service = 2
}

/// <summary>
/// Optional planning role for inventory items. This is deliberately separate from
/// <see cref="ItemType"/> so existing Product/Service behaviour remains unchanged.
/// </summary>
public enum ProcurementItemClassification
{
    FinishedProduct = 1,
    RawMaterial = 2,
    Component = 3,
    PackingMaterial = 4
}
