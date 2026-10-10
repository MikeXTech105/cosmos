namespace Cosmos.Domain.ProcurementPlanning;

public enum PlanningRunStatus
{
    Draft = 1,
    Finalized = 2,
    Calculated = 3,
    Reviewed = 4,
    Cancelled = 5
}

public enum PlanningRoundingRule
{
    None = 1,
    UpToOrderMultiple = 2
}

public enum PlanningMessageSeverity
{
    Information = 1,
    Warning = 2,
    BlockingError = 3
}

public enum SalesImportBatchStatus
{
    Completed = 1,
    Cancelled = 2
}
