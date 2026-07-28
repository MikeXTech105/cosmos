namespace Cosmos.Domain.DispatchPlanning;

public enum DispatchTier
{
    Tier1 = 1,
    Tier2 = 2,
    Tier3 = 3
}

public enum DispatchRoundingMode
{
    Exact = 1,
    NearestBox = 2,
    RoundUpToBox = 3,
    RoundDownToBox = 4,
    ExactBelowOneBox = 5,
    HalfBoxThreshold = 6
}

public enum DispatchInboundStatus
{
    Planned = 1,
    Dispatched = 2,
    InTransit = 3,
    Received = 4,
    Cancelled = 5
}

public enum DispatchCompanyStockSourceType
{
    SystemStock = 1,
    ImportedSnapshot = 2,
    ManualSnapshot = 3
}

public enum DispatchPlanningRunStatus
{
    Draft = 1,
    Calculated = 2,
    Allocated = 3,
    Finalized = 4,
    Cancelled = 5
}

public enum DispatchSnapshotImportType
{
    WarehouseSales = 1,
    WarehouseStock = 2,
    WarehouseInbound = 3
}
