using Cosmos.Application.DispatchPlanning;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DispatchPlanning;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IDispatchPlanningRepository
{
    Task<PagedResult<DispatchSkuSettingDto>> GetSkuSettingsAsync(DispatchSkuSettingQuery query, CancellationToken ct);
    Task<DispatchSkuSettingDto?> GetSkuSettingAsync(long id, CancellationToken ct);
    Task<DispatchSkuSettingDto> SaveSkuSettingAsync(long? id, SaveDispatchSkuSettingRequest request, long? userId, CancellationToken ct);
    Task DeleteSkuSettingAsync(long id, long? userId, CancellationToken ct);
    Task<DispatchSnapshotImportValidationDto> ValidateSnapshotImportAsync(ValidateDispatchSnapshotImportRequest request, long? userId, string correlationId, CancellationToken ct);
    Task<DispatchSnapshotImportBatchDto> CommitSnapshotImportAsync(long id, CommitDispatchSnapshotImportRequest request, long? userId, CancellationToken ct);
    Task CancelSnapshotImportAsync(long id, string reason, long? userId, CancellationToken ct);
    Task<PagedResult<DispatchSnapshotImportBatchDto>> GetSnapshotImportBatchesAsync(DispatchSnapshotImportBatchQuery query, CancellationToken ct);
    Task<DispatchPlanningRunDto> CreateRunAsync(CreateDispatchPlanningRunRequest request, long? userId, CancellationToken ct);
    Task<IReadOnlyCollection<DispatchCalculationInput>> GetCalculationInputsAsync(long runId, CancellationToken ct);
    Task<DispatchPlanningRunDto> SaveCalculationAsync(long runId, IReadOnlyCollection<DispatchRecommendationDto> lines, long? userId, CancellationToken ct);
    Task<PagedResult<DispatchPlanningRunSummaryDto>> GetRunsAsync(DispatchPlanningRunQuery query, CancellationToken ct);
    Task<DispatchPlanningRunDto?> GetRunAsync(long id, CancellationToken ct);
    Task<IReadOnlyCollection<DispatchRecommendationDto>> GetRecommendationsAsync(long runId, DispatchRecommendationQuery query, CancellationToken ct);
    Task<DispatchRecommendationDto> OverrideRecommendationAsync(long runId, long recommendationId, UpdateDispatchRecommendationRequest request, long? userId, CancellationToken ct);
    Task<DispatchPlanningRunDto> AllocateAsync(long id, IReadOnlyCollection<DispatchAllocationLine> allocations, string? notes, long? userId, CancellationToken ct);
    Task<DispatchPlanningRunDto> FinalizeAsync(long id, long? userId, CancellationToken ct);
    Task<DispatchPlanningRunDto> CancelAsync(long id, string reason, long? userId, CancellationToken ct);
    Task<PagedResult<DispatchRecommendationReportRowDto>> GetRecommendationReportAsync(DispatchRecommendationReportQuery query, CancellationToken ct);
}
