using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.ProcurementPlanning;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IProcurementPlanningRepository
{
    Task<PagedResult<SalesChannelDto>> GetChannelsAsync(ProcurementListQuery query, CancellationToken ct);
    Task<SalesChannelDto?> GetChannelAsync(long id, CancellationToken ct);
    Task<SalesChannelDto> SaveChannelAsync(long? id, SaveSalesChannelRequest request, long? userId, CancellationToken ct);
    Task SetChannelStatusAsync(long id, bool isActive, long? userId, CancellationToken ct);

    Task<PagedResult<ChannelSkuMappingDto>> GetSkuMappingsAsync(ChannelSkuMappingQuery query, CancellationToken ct);
    Task<ChannelSkuMappingDto?> GetSkuMappingAsync(long id, CancellationToken ct);
    Task<ChannelSkuMappingDto> SaveSkuMappingAsync(long? id, SaveChannelSkuMappingRequest request, long? userId, CancellationToken ct);
    Task SetSkuMappingStatusAsync(long id, bool isActive, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<UnmappedChannelSkuDto>> GetUnmappedSkusAsync(CancellationToken ct);

    Task<IReadOnlyCollection<ImportLookupRow>> GetImportLookupAsync(CancellationToken ct);
    Task<bool> ImportFileExistsAsync(string fileHash, CancellationToken ct);
    Task<SalesImportConfirmResultDto> ConfirmImportAsync(string originalFileName, string fileHash, bool allowDuplicate, string? correctionReason, IReadOnlyCollection<ConfirmedSalesImportRow> rows, long? userId, CancellationToken ct);
    Task<PagedResult<SalesImportBatchDto>> GetImportBatchesAsync(SalesImportBatchQuery query, CancellationToken ct);
    Task<SalesImportBatchDto?> GetImportBatchAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<SalesHistoryDto>> GetImportBatchRowsAsync(long id, CancellationToken ct);
    Task CancelImportBatchAsync(long id, string reason, long? userId, CancellationToken ct);

    Task<SalesHistoryDto> SaveManualSalesAsync(long? id, ManualSalesEntryRequest request, long? userId, CancellationToken ct);
    Task<SalesHistoryDto?> GetSalesHistoryByIdAsync(long id, CancellationToken ct);
    Task DeleteManualSalesAsync(long id, long? userId, CancellationToken ct);
    Task<PagedResult<SalesHistoryDto>> GetSalesHistoryAsync(SalesHistoryQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<SalesSummaryChannelDto>> GetSummaryChannelsAsync(CancellationToken ct);
    Task<IReadOnlyCollection<SalesSummaryFlatRow>> GetSalesSummaryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct);

    Task<ProductBomDto?> GetProductBomAsync(long finishedProductItemId, CancellationToken ct);
    Task<ProductBomDto> SaveProductBomAsync(long finishedProductItemId, SaveProductBomRequest request, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<ProcurementConfigurationIssueDto>> GetBomIssuesAsync(CancellationToken ct);

    Task<PagedResult<ProcurementSettingDto>> GetSettingsAsync(ProcurementSettingQuery query, CancellationToken ct);
    Task<ProcurementSettingDto?> GetSettingByItemAsync(long itemId, CancellationToken ct);
    Task<ProcurementSettingDto> SaveSettingAsync(SaveProcurementSettingRequest request, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<ProcurementConfigurationIssueDto>> GetMissingSettingsAsync(CancellationToken ct);
    Task<LeadTimeHistoryDto> AddLeadTimeHistoryAsync(CreateLeadTimeHistoryRequest request, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<LeadTimeHistoryDto>> GetLeadTimeHistoryAsync(long itemId, CancellationToken ct);

    Task<ProcurementCalculationData> GetCalculationDataAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct);
    Task<PlanningRunDto> SavePlanningRunAsync(PlanningRunSaveModel model, long? userId, CancellationToken ct);
    Task<PagedResult<PlanningRunSummaryDto>> GetPlanningRunsAsync(PlanningRunQuery query, CancellationToken ct);
    Task<PlanningRunDto?> GetPlanningRunAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<PlanningRunLineDto>> GetPlanningRunLinesAsync(long id, PlanningRunLineQuery query, CancellationToken ct);
    Task<PlanningRunLineDto> UpdatePlanningLineAsync(long runId, long lineId, UpdatePlanningLineRequest request, long? userId, CancellationToken ct);
    Task<PlanningRunDto> FinalizePlanningRunAsync(long id, long? userId, CancellationToken ct);
}
