using Cosmos.Application.Oee;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Oee;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IOeeService
{
    Task<ApiResponse<PagedResult<OeeMachineDto>>> GetMachinesAsync(OeeMasterListQuery query, CancellationToken ct);
    Task<ApiResponse<OeeMachineDto>> GetMachineAsync(long id, CancellationToken ct);
    Task<ApiResponse<OeeMachineDto>> CreateMachineAsync(CreateOeeMachineRequest request, CancellationToken ct);
    Task<ApiResponse<OeeMachineDto>> UpdateMachineAsync(long id, UpdateOeeMachineRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteMachineAsync(long id, CancellationToken ct);

    Task<ApiResponse<PagedResult<OeeMouldDto>>> GetMouldsAsync(OeeMasterListQuery query, CancellationToken ct);
    Task<ApiResponse<OeeMouldDto>> GetMouldAsync(long id, CancellationToken ct);
    Task<ApiResponse<OeeMouldDto>> CreateMouldAsync(CreateOeeMouldRequest request, CancellationToken ct);
    Task<ApiResponse<OeeMouldDto>> UpdateMouldAsync(long id, UpdateOeeMouldRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteMouldAsync(long id, CancellationToken ct);

    Task<ApiResponse<PagedResult<OeeDowntimeReasonDto>>> GetDowntimeReasonsAsync(OeeMasterListQuery query, CancellationToken ct);
    Task<ApiResponse<OeeDowntimeReasonDto>> GetDowntimeReasonAsync(long id, CancellationToken ct);
    Task<ApiResponse<OeeDowntimeReasonDto>> CreateDowntimeReasonAsync(CreateOeeDowntimeReasonRequest request, CancellationToken ct);
    Task<ApiResponse<OeeDowntimeReasonDto>> UpdateDowntimeReasonAsync(long id, UpdateOeeDowntimeReasonRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteDowntimeReasonAsync(long id, CancellationToken ct);

    Task<ApiResponse<PagedResult<OeeProductionEntryDto>>> GetProductionEntriesAsync(OeeProductionEntryListQuery query, CancellationToken ct);
    Task<ApiResponse<OeeProductionEntryDto>> GetProductionEntryAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeProductionEntryDto>>> CreateBulkProductionEntriesAsync(BulkCreateOeeProductionEntriesRequest request, CancellationToken ct);
    Task<ApiResponse<OeeProductionEntryDto>> UpdateProductionEntryAsync(long id, UpdateOeeProductionEntryRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteProductionEntryAsync(long id, CancellationToken ct);

    Task<ApiResponse<OeeDashboardSummaryDto>> GetDashboardSummaryAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>> GetMachineWiseAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>> GetMouldWiseAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>> GetTopDowntimeReasonsAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeDailyTrendDto>>> GetDailyTrendAsync(OeeDashboardQuery query, CancellationToken ct);

    Task<ApiResponse<IReadOnlyCollection<OeeDailyReportDto>>> GetDailyReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>> GetMachinePerformanceReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>> GetMouldPerformanceReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>> GetDowntimeReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<OeeExportFileDto> ExportDailyReportAsync(OeeReportQuery query, CancellationToken ct);
}
