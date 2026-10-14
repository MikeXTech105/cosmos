using Cosmos.Contracts.Common;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IDispatchPlanningService
{
    Task<ApiResponse<PagedResult<DispatchSkuSettingDto>>> GetSkuSettingsAsync(DispatchSkuSettingQuery query, CancellationToken ct);
    Task<ApiResponse<DispatchSkuSettingDto>> GetSkuSettingAsync(long id, CancellationToken ct);
    Task<ApiResponse<DispatchSkuSettingDto>> CreateSkuSettingAsync(SaveDispatchSkuSettingRequest request, CancellationToken ct);
    Task<ApiResponse<DispatchSkuSettingDto>> UpdateSkuSettingAsync(long id, SaveDispatchSkuSettingRequest request, CancellationToken ct);
    Task<ApiResponse> DeleteSkuSettingAsync(long id, CancellationToken ct);

    Task<ApiResponse<DispatchSnapshotImportValidationDto>> ValidateSnapshotImportAsync(ValidateDispatchSnapshotImportRequest request, CancellationToken ct);
    Task<ApiResponse<DispatchSnapshotImportValidationDto>> ValidateManualSnapshotAsync(ValidateManualDispatchSnapshotRequest request, CancellationToken ct);
    Task<ApiResponse<DispatchSnapshotImportBatchDto>> CommitSnapshotImportAsync(long id, CommitDispatchSnapshotImportRequest request, CancellationToken ct);
    Task<ApiResponse> CancelSnapshotImportAsync(long id, CancelDispatchSnapshotImportRequest request, CancellationToken ct);
    Task<ApiResponse<PagedResult<DispatchSnapshotImportBatchDto>>> GetSnapshotImportBatchesAsync(DispatchSnapshotImportBatchQuery query, CancellationToken ct);

    Task<ApiResponse<DispatchPlanningRunDto>> CreateRunAsync(CreateDispatchPlanningRunRequest request, CancellationToken ct);
    Task<ApiResponse<DispatchPlanningRunDto>> CalculateRunAsync(long id, CancellationToken ct);
    Task<ApiResponse<PagedResult<DispatchPlanningRunSummaryDto>>> GetRunsAsync(DispatchPlanningRunQuery query, CancellationToken ct);
    Task<ApiResponse<DispatchPlanningRunDto>> GetRunAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<DispatchRecommendationDto>>> GetRecommendationsAsync(long runId, DispatchRecommendationQuery query, CancellationToken ct);
    Task<ApiResponse<DispatchRecommendationDto>> OverrideRecommendationAsync(long runId, long recommendationId, UpdateDispatchRecommendationRequest request, CancellationToken ct);
    Task<ApiResponse<DispatchPlanningRunDto>> AllocateAsync(long id, AllocateDispatchPlanningRunRequest request, CancellationToken ct);
    Task<ApiResponse<DispatchPlanningRunDto>> FinalizeAsync(long id, CancellationToken ct);
    Task<ApiResponse<DispatchPlanningRunDto>> CancelAsync(long id, CancelDispatchPlanningRunRequest request, CancellationToken ct);
    Task<ApiResponse<PagedResult<DispatchRecommendationReportRowDto>>> GetRecommendationReportAsync(DispatchRecommendationReportQuery query, CancellationToken ct);
}
