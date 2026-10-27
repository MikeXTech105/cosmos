namespace Cosmos.Domain.Manufacturing;

// Separate from the historical ManufacturingProductionStatus, whose values are immutable.
public enum ProductionOrderStatus { Draft = 1, Released = 2, InProgress = 3, Completed = 4, Closed = 5, Cancelled = 6 }
public enum ProductionRateBasis { UnitsPerMinute = 1, SecondsPerUnit = 2, ShotsPerMinute = 3 }
public enum DemandFreshness { Current = 1, Stale = 2, Missing = 3, NoDemand = 4 }
