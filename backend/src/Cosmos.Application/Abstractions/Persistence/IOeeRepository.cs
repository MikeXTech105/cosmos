using Cosmos.Application.Oee;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Oee;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IOeeRepository
{
    Task<PagedResult<OeeDayAcknowledgementDto>> GetDayAcknowledgementsAsync(OeeDayAcknowledgementQuery query, CancellationToken ct);
    Task<OeeDayAcknowledgementDto> SaveDayAcknowledgementAsync(SaveOeeDayAcknowledgementRequest request, long? userId, CancellationToken ct);
    Task<bool> MachineExistsAsync(long id, CancellationToken ct);
    Task<bool> MouldExistsAsync(long id, CancellationToken ct);
    Task<bool> DowntimeReasonExistsAsync(long? id, CancellationToken ct);

    Task<PagedResult<OeeMachineDto>> GetMachinesAsync(OeeMasterListQuery query, CancellationToken ct);
    Task<OeeMachineDto?> GetMachineAsync(long id, CancellationToken ct);
    Task<OeeMachineDto> SaveMachineAsync(long? id, CreateOeeMachineRequest request, long? userId, CancellationToken ct);
    Task DeleteMachineAsync(long id, long? userId, CancellationToken ct);

    Task<PagedResult<OeeMouldDto>> GetMouldsAsync(OeeMasterListQuery query, CancellationToken ct);
    Task<OeeMouldDto?> GetMouldAsync(long id, CancellationToken ct);
    Task<OeeMouldDto> SaveMouldAsync(long? id, CreateOeeMouldRequest request, long? userId, CancellationToken ct);
    Task DeleteMouldAsync(long id, long? userId, CancellationToken ct);

    Task<PagedResult<OeeDowntimeReasonDto>> GetDowntimeReasonsAsync(OeeMasterListQuery query, CancellationToken ct);
    Task<OeeDowntimeReasonDto?> GetDowntimeReasonAsync(long id, CancellationToken ct);
    Task<OeeDowntimeReasonDto> SaveDowntimeReasonAsync(long? id, CreateOeeDowntimeReasonRequest request, long? userId, CancellationToken ct);
    Task DeleteDowntimeReasonAsync(long id, long? userId, CancellationToken ct);

    Task<PagedResult<OeeProductionEntryDto>> GetProductionEntriesAsync(OeeProductionEntryListQuery query, CancellationToken ct);
    Task<OeeProductionEntryDto?> GetProductionEntryAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<OeeProductionEntryDto>> SaveBulkProductionEntriesAsync(BulkCreateOeeProductionEntriesRequest request, long? userId, CancellationToken ct);
    Task<OeeProductionEntryDto> SaveProductionEntryAsync(long id, UpdateOeeProductionEntryRequest request, long? userId, CancellationToken ct);
    Task DeleteProductionEntryAsync(long id, long? userId, CancellationToken ct);

    Task<OeeDashboardSummaryDto> GetDashboardSummaryAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeMachineWiseDto>> GetMachineWiseAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeMouldWiseDto>> GetMouldWiseAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>> GetTopDowntimeReasonsAsync(OeeDashboardQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeDailyTrendDto>> GetDailyTrendAsync(OeeDashboardQuery query, CancellationToken ct);

    Task<IReadOnlyCollection<OeeDailyReportDto>> GetDailyReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeMachineWiseDto>> GetMachinePerformanceReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeMouldWiseDto>> GetMouldPerformanceReportAsync(OeeReportQuery query, CancellationToken ct);
    Task<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>> GetDowntimeReportAsync(OeeReportQuery query, CancellationToken ct);
}
