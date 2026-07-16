using Cosmos.Contracts.Common;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IProcurementCalculationService
{
    ProcurementPlanning.ProcurementCalculationResult Calculate(ProcurementPlanning.ProcurementCalculationData data, DateOnly fromDate, DateOnly toDate);
}

public interface IProcurementPlanningService
{
    Task<ApiResponse<PagedResult<SalesChannelDto>>> GetChannelsAsync(ProcurementListQuery query, CancellationToken ct);
    Task<ApiResponse<SalesChannelDto>> GetChannelAsync(long id, CancellationToken ct);
    Task<ApiResponse<SalesChannelDto>> CreateChannelAsync(SaveSalesChannelRequest request, CancellationToken ct);
    Task<ApiResponse<SalesChannelDto>> UpdateChannelAsync(long id, SaveSalesChannelRequest request, CancellationToken ct);
    Task<ApiResponse> SetChannelStatusAsync(long id, ChangeActiveStatusRequest request, CancellationToken ct);

    Task<ApiResponse<PagedResult<ChannelSkuMappingDto>>> GetSkuMappingsAsync(ChannelSkuMappingQuery query, CancellationToken ct);
    Task<ApiResponse<ChannelSkuMappingDto>> GetSkuMappingAsync(long id, CancellationToken ct);
    Task<ApiResponse<ChannelSkuMappingDto>> CreateSkuMappingAsync(SaveChannelSkuMappingRequest request, CancellationToken ct);
    Task<ApiResponse<ChannelSkuMappingDto>> UpdateSkuMappingAsync(long id, SaveChannelSkuMappingRequest request, CancellationToken ct);
    Task<ApiResponse> SetSkuMappingStatusAsync(long id, ChangeActiveStatusRequest request, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<UnmappedChannelSkuDto>>> GetUnmappedSkusAsync(CancellationToken ct);

    ProcurementExportFileDto BuildImportTemplate();
    Task<ApiResponse<SalesImportPreviewDto>> PreviewImportAsync(string fileName, byte[] content, CancellationToken ct);
    Task<ApiResponse<SalesImportConfirmResultDto>> ConfirmImportAsync(string fileName, byte[] content, bool allowDuplicate, string? correctionReason, CancellationToken ct);
    Task<ApiResponse<PagedResult<SalesImportBatchDto>>> GetImportBatchesAsync(SalesImportBatchQuery query, CancellationToken ct);
    Task<ApiResponse<SalesImportBatchDetailsDto>> GetImportBatchAsync(long id, CancellationToken ct);
    Task<ApiResponse> CancelImportBatchAsync(long id, CancelSalesImportBatchRequest request, CancellationToken ct);

    Task<ApiResponse<SalesHistoryDto>> CreateManualSalesAsync(ManualSalesEntryRequest request, CancellationToken ct);
    Task<ApiResponse<SalesHistoryDto>> UpdateManualSalesAsync(long id, ManualSalesEntryRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteManualSalesAsync(long id, CancellationToken ct);
    Task<ApiResponse<PagedResult<SalesHistoryDto>>> GetSalesHistoryAsync(SalesHistoryQuery query, CancellationToken ct);
    Task<ApiResponse<ProductSalesSummaryDto>> GetSalesSummaryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct);

    Task<ApiResponse<ProductBomDto>> GetProductBomAsync(long productId, CancellationToken ct);
    Task<ApiResponse<ProductBomDto>> SaveProductBomAsync(long productId, SaveProductBomRequest request, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>> GetBomIssuesAsync(CancellationToken ct);

    Task<ApiResponse<PagedResult<ProcurementSettingDto>>> GetSettingsAsync(ProcurementSettingQuery query, CancellationToken ct);
    Task<ApiResponse<ProcurementSettingDto>> GetSettingByItemAsync(long itemId, CancellationToken ct);
    Task<ApiResponse<ProcurementSettingDto>> SaveSettingAsync(SaveProcurementSettingRequest request, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>> GetMissingSettingsAsync(CancellationToken ct);
    Task<ApiResponse<LeadTimeHistoryDto>> AddLeadTimeHistoryAsync(CreateLeadTimeHistoryRequest request, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<LeadTimeHistoryDto>>> GetLeadTimeHistoryAsync(long itemId, CancellationToken ct);

    Task<ApiResponse<PlanningValidationDto>> ValidatePlanningAsync(PlanningRequest request, CancellationToken ct);
    Task<ApiResponse<PlanningPreviewDto>> PreviewPlanningAsync(PlanningRequest request, CancellationToken ct);
    Task<ApiResponse<PlanningRunDto>> SavePlanningRunAsync(PlanningRequest request, CancellationToken ct);
    Task<ApiResponse<PagedResult<PlanningRunSummaryDto>>> GetPlanningRunsAsync(PlanningRunQuery query, CancellationToken ct);
    Task<ApiResponse<PlanningRunDto>> GetPlanningRunAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<PlanningRunLineDto>>> GetPlanningRunLinesAsync(long id, PlanningRunLineQuery query, CancellationToken ct);
    Task<ApiResponse<PlanningRunLineDto>> UpdatePlanningLineAsync(long runId, long lineId, UpdatePlanningLineRequest request, CancellationToken ct);
    Task<ApiResponse<PlanningRunDto>> FinalizePlanningRunAsync(long id, CancellationToken ct);
    Task<ProcurementExportFileDto> ExportPlanningRunAsync(long id, CancellationToken ct);
}
