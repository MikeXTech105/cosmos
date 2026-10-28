using Cosmos.Contracts.Common;
using Cosmos.Contracts.Manufacturing;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IProductionWorkspaceService
{
    Task<ApiResponse<CapacityCalendarContextDto>> CalendarContextAsync(long id, DateOnly businessDate, CancellationToken ct);
    Task<ApiResponse<PackagingConversionDto>> PackagingConversionAsync(long id,PackagingConversionRequest? r,CancellationToken ct);
    Task<ApiResponse<FinishedPlanningSnapshotPage>> SnapshotAsync(Guid id,ProductionWorkspaceQuery q,CancellationToken ct);
    Task<ApiResponse<StockBalanceDto>> StockAsync(long id,CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> AdjustStockAsync(long id,StockAdjustmentRequest r,CancellationToken ct);
    Task<ApiResponse<PagedResult<ProductionMasterDto>>> MastersAsync(string kind, ProductionWorkspaceQuery q, CancellationToken ct);
    Task<ApiResponse<ProductionMasterDto>> MasterByIdAsync(string kind, long id, CancellationToken ct);
    Task<ApiResponse<ProductionMasterDto>> WorkCentreAsync(long? id, WorkCentreRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionMasterDto>> OperationAsync(long? id, OperationRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> RoutingAsync(long itemId, ItemRoutingRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> EligibilityAsync(long itemId, ItemEligibilityRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ShiftAsync(long workCentreId, WorkCentreShiftRequest r, CancellationToken ct);
    Task<ApiResponse<PagedResult<ProductionOrderDto>>> OrdersAsync(ProductionWorkspaceQuery q, CancellationToken ct);
    Task<ApiResponse<ProductionOrderDto>> OrderAsync(long id, CancellationToken ct);
    Task<ApiResponse<ProductionOrderContextDto>> ContextAsync(long id, CancellationToken ct);
    Task<ApiResponse<ProductionOrderLabelsDto>> OrderLabelsAsync(long id, CancellationToken ct);
    Task<ApiResponse<ProductionConfigurationDto>> ConfigurationAsync(long id, string kind, CancellationToken ct);
    Task<ApiResponse<CapacityFeasibilityDto>> CapacityAsync(long id, DateOnly date, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> CalendarAsync(long shiftConfigurationId, CapacityCalendarRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ScheduleAsync(long id, CapacityScheduleRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionOrderDto>> DraftAsync(long? id, ProductionOrderDraftRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ReleaseAsync(long id, ProductionOrderReleaseRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> CompleteAsync(long id, ProductionCompletionRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ActionAsync(long id, string action, ProductionOrderActionRequest r, CancellationToken ct);
    Task<ApiResponse<FinishedPlanningSnapshot>> PlanAsync(FinishedPlanningRequest r, CancellationToken ct);
    Task<ApiResponse<MaterialFeasibilityDto>> MaterialsAsync(MaterialFeasibilityRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> ObserveDemandAsync(ProductionDemandObservationRequest r, CancellationToken ct);
    Task<ApiResponse<PagedResult<ProductionDemandObservationDto>>> DemandObservationsAsync(ProductionWorkspaceQuery q, CancellationToken ct);
    Task<ApiResponse<PagedResult<ProductionReportRow>>> ReportAsync(string kind, ProductionWorkspaceQuery q, CancellationToken ct);
    Task<ApiResponse<ProductionImportResult>> StageAsync(ProductionImportRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionImportPreview>> ImportPreviewAsync(Guid id, ProductionWorkspaceQuery q, CancellationToken ct);
    Task<ApiResponse<ProductionImportResult>> MapImportAsync(Guid id, ProductionImportMappingRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionImportResult>> ImportActionAsync(Guid id, string action, ProductionImportActionRequest r, CancellationToken ct);
    Task<ApiResponse<PagedResult<ProductionOperationalReportRow>>> OperationalReportAsync(string kind, ProductionWorkspaceQuery q, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> AmendAsync(long id, ProductionOrderAmendRequest r, CancellationToken ct);
    Task<ApiResponse<ProductionCommandResult>> EndEffectivityAsync(string kind, long id, ProductionEffectivityRequest r, CancellationToken ct);
}
