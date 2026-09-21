using Cosmos.Domain.Manufacturing;

namespace Cosmos.Contracts.Manufacturing;

public sealed record ManufacturingBomComponentRequest(long ComponentItemId, decimal Quantity, long? UnitId, decimal WastagePercentage = 0, string? Notes = null, int SortOrder = 0);
public sealed record CreateManufacturingBomRequest(long FinishedItemId, string Version, DateOnly EffectiveFrom, DateOnly? EffectiveTo, string? Notes, bool IsDefault, IReadOnlyCollection<ManufacturingBomComponentRequest> Components);
public sealed record UpdateManufacturingBomRequest(DateOnly EffectiveFrom, DateOnly? EffectiveTo, string? Notes, bool IsDefault, IReadOnlyCollection<ManufacturingBomComponentRequest> Components);
public sealed record ManufacturingBomQuery(string? Search = null, long? FinishedItemId = null, ManufacturingBomStatus? Status = null, int PageNumber = 1, int PageSize = 50, string SortBy = "CreatedAt", string SortDirection = "DESC");
public sealed record ManufacturingBomComponentDto(long Id, long ComponentItemId, string ComponentItemCode, string ComponentItemName, decimal Quantity, long UnitId, string UnitName, decimal WastagePercentage, decimal ConsumptionPerUnit, string? Notes, int SortOrder);
public sealed record ManufacturingBomDto(long Id, string BomNumber, long FinishedItemId, string FinishedItemCode, string FinishedItemName, string Version, ManufacturingBomStatus Status, DateOnly EffectiveFrom, DateOnly? EffectiveTo, string? Notes, bool IsDefault, bool IsActive, IReadOnlyCollection<ManufacturingBomComponentDto> Components);
public sealed record ManufacturingBomListItemDto(long Id, string BomNumber, long FinishedItemId, string FinishedItemCode, string FinishedItemName, string Version, ManufacturingBomStatus Status, DateOnly EffectiveFrom, bool IsDefault, int TotalCount);

public sealed record CreateManufacturingProductionRequest(DateOnly ProductionDate, long FinishedItemId, long? BomId, decimal PlannedQuantity, decimal ProducedQuantity, string? Notes = null, string? ReferenceNumber = null);
public sealed record UpdateManufacturingProductionRequest(DateOnly ProductionDate, decimal PlannedQuantity, decimal ProducedQuantity, string? Notes = null, string? ReferenceNumber = null);
public sealed record ManufacturingProductionQuery(string? Search = null, long? FinishedItemId = null, ManufacturingProductionStatus? Status = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 50, string SortBy = "ProductionDate", string SortDirection = "DESC");
public sealed record ManufacturingProductionMaterialDto(long Id, long ComponentItemId, string ComponentItemCode, string ComponentItemName, decimal RequiredQuantity, decimal WastageQuantity, decimal TotalConsumedQuantity, long UnitId, string UnitName);
public sealed record ManufacturingProductionDto(long Id, string ProductionNumber, DateOnly ProductionDate, long FinishedItemId, string FinishedItemCode, string FinishedItemName, long BomId, string BomVersion, decimal PlannedQuantity, decimal ProducedQuantity, ManufacturingProductionStatus Status, string? Notes, string? ReferenceNumber, IReadOnlyCollection<ManufacturingProductionMaterialDto> Materials);
public sealed record ManufacturingProductionListItemDto(long Id, string ProductionNumber, DateOnly ProductionDate, long FinishedItemId, string FinishedItemCode, string FinishedItemName, string BomVersion, decimal PlannedQuantity, decimal ProducedQuantity, ManufacturingProductionStatus Status, int TotalCount);
public sealed record CancelManufacturingProductionRequest(string Reason);
