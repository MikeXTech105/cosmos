using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.DispatchPlanning;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DispatchPlanning;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class DispatchPlanningService : IDispatchPlanningService
{
    private readonly IDispatchPlanningRepository _repository;
    private readonly DispatchCalculationService _calculator;
    private readonly DispatchAllocationService _allocationService;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<DispatchPlanningService> _logger;
    private readonly IValidator<DispatchSkuSettingQuery> _settingQueryValidator;
    private readonly IValidator<SaveDispatchSkuSettingRequest> _settingValidator;
    private readonly IValidator<ValidateDispatchSnapshotImportRequest> _importValidator;
    private readonly IValidator<ValidateManualDispatchSnapshotRequest> _manualEntryValidator;
    private readonly IValidator<DispatchSnapshotImportBatchQuery> _importQueryValidator;
    private readonly IValidator<CommitDispatchSnapshotImportRequest> _commitImportValidator;
    private readonly IValidator<CancelDispatchSnapshotImportRequest> _cancelImportValidator;
    private readonly IValidator<CreateDispatchPlanningRunRequest> _createRunValidator;
    private readonly IValidator<DispatchPlanningRunQuery> _runQueryValidator;
    private readonly IValidator<DispatchRecommendationQuery> _recommendationQueryValidator;
    private readonly IValidator<UpdateDispatchRecommendationRequest> _overrideValidator;
    private readonly IValidator<AllocateDispatchPlanningRunRequest> _allocateValidator;
    private readonly IValidator<CancelDispatchPlanningRunRequest> _cancelRunValidator;
    private readonly IValidator<DispatchRecommendationReportQuery> _reportValidator;

    public DispatchPlanningService(
        IDispatchPlanningRepository repository,
        DispatchCalculationService calculator,
        DispatchAllocationService allocationService,
        IAuditRepository audit,
        ICurrentUser currentUser,
        ILogger<DispatchPlanningService> logger,
        IValidator<DispatchSkuSettingQuery> settingQueryValidator,
        IValidator<SaveDispatchSkuSettingRequest> settingValidator,
        IValidator<ValidateDispatchSnapshotImportRequest> importValidator,
        IValidator<ValidateManualDispatchSnapshotRequest> manualEntryValidator,
        IValidator<DispatchSnapshotImportBatchQuery> importQueryValidator,
        IValidator<CommitDispatchSnapshotImportRequest> commitImportValidator,
        IValidator<CancelDispatchSnapshotImportRequest> cancelImportValidator,
        IValidator<CreateDispatchPlanningRunRequest> createRunValidator,
        IValidator<DispatchPlanningRunQuery> runQueryValidator,
        IValidator<DispatchRecommendationQuery> recommendationQueryValidator,
        IValidator<UpdateDispatchRecommendationRequest> overrideValidator,
        IValidator<AllocateDispatchPlanningRunRequest> allocateValidator,
        IValidator<CancelDispatchPlanningRunRequest> cancelRunValidator,
        IValidator<DispatchRecommendationReportQuery> reportValidator)
    {
        _repository = repository;
        _calculator = calculator;
        _allocationService = allocationService;
        _audit = audit;
        _currentUser = currentUser;
        _logger = logger;
        _settingQueryValidator = settingQueryValidator;
        _settingValidator = settingValidator;
        _importValidator = importValidator;
        _manualEntryValidator = manualEntryValidator;
        _importQueryValidator = importQueryValidator;
        _commitImportValidator = commitImportValidator;
        _cancelImportValidator = cancelImportValidator;
        _createRunValidator = createRunValidator;
        _runQueryValidator = runQueryValidator;
        _recommendationQueryValidator = recommendationQueryValidator;
        _overrideValidator = overrideValidator;
        _allocateValidator = allocateValidator;
        _cancelRunValidator = cancelRunValidator;
        _reportValidator = reportValidator;
    }

    public async Task<ApiResponse<PagedResult<DispatchSkuSettingDto>>> GetSkuSettingsAsync(DispatchSkuSettingQuery query, CancellationToken ct)
    {
        await ValidateAsync(_settingQueryValidator, query, ct);
        return ApiResponse<PagedResult<DispatchSkuSettingDto>>.Success(await _repository.GetSkuSettingsAsync(query, ct));
    }

    public async Task<ApiResponse<DispatchSkuSettingDto>> GetSkuSettingAsync(long id, CancellationToken ct)
    {
        var item = await _repository.GetSkuSettingAsync(id, ct) ?? throw new CosmosException("Dispatch SKU setting was not found.", 404);
        return ApiResponse<DispatchSkuSettingDto>.Success(item);
    }

    public async Task<ApiResponse<DispatchSkuSettingDto>> CreateSkuSettingAsync(SaveDispatchSkuSettingRequest request, CancellationToken ct)
    {
        await ValidateAsync(_settingValidator, request, ct);
        var result = await _repository.SaveSkuSettingAsync(null, request, _currentUser.UserId, ct);
        await AuditAsync("DispatchSkuSettings", result.Id, "Create", null, result, ct);
        return ApiResponse<DispatchSkuSettingDto>.Success(result, "Dispatch SKU setting created.");
    }

    public async Task<ApiResponse<DispatchSkuSettingDto>> UpdateSkuSettingAsync(long id, SaveDispatchSkuSettingRequest request, CancellationToken ct)
    {
        await ValidateAsync(_settingValidator, request, ct);
        var old = await _repository.GetSkuSettingAsync(id, ct) ?? throw new CosmosException("Dispatch SKU setting was not found.", 404);
        var result = await _repository.SaveSkuSettingAsync(id, request, _currentUser.UserId, ct);
        await AuditAsync("DispatchSkuSettings", id, "Update", old, result, ct);
        return ApiResponse<DispatchSkuSettingDto>.Success(result, "Dispatch SKU setting updated.");
    }

    public async Task<ApiResponse> DeleteSkuSettingAsync(long id, CancellationToken ct)
    {
        var old = await _repository.GetSkuSettingAsync(id, ct) ?? throw new CosmosException("Dispatch SKU setting was not found.", 404);
        await _repository.DeleteSkuSettingAsync(id, _currentUser.UserId, ct);
        await AuditAsync("DispatchSkuSettings", id, "Delete", old, null, ct);
        return ApiResponse.Success("Dispatch SKU setting deleted.");
    }

    public async Task<ApiResponse<DispatchSnapshotImportValidationDto>> ValidateSnapshotImportAsync(ValidateDispatchSnapshotImportRequest request, CancellationToken ct)
    {
        await ValidateAsync(_importValidator, request, ct);
        request = request with { FileHash = string.IsNullOrWhiteSpace(request.FileHash) ? CreateSnapshotHash(request.ChannelId, request.ImportType, request.Rows) : request.FileHash };
        var result = await _repository.ValidateSnapshotImportAsync(request, _currentUser.UserId, Guid.NewGuid().ToString("N"), ct);
        await AuditAsync("SupplyChainImportBatches", result.BatchId, "ValidateDispatchImport", null, new { request.ImportType, result.TotalRows, result.ValidRows, result.InvalidRows }, ct);
        return ApiResponse<DispatchSnapshotImportValidationDto>.Success(result, "Dispatch snapshot import validated.");
    }

    public async Task<ApiResponse<DispatchSnapshotImportValidationDto>> ValidateManualSnapshotAsync(ValidateManualDispatchSnapshotRequest request, CancellationToken ct)
    {
        await ValidateAsync(_manualEntryValidator, request, ct);
        var fileHash = CreateSnapshotHash(request.ChannelId, request.ImportType, new[] { request.Row });
        var importRequest = new ValidateDispatchSnapshotImportRequest(
            $"Manual dispatch entry - {DateTime.UtcNow:yyyyMMddHHmmss}.csv",
            fileHash,
            request.ImportType,
            request.ChannelId,
            new[] { request.Row });
        return await ValidateSnapshotImportAsync(importRequest, ct);
    }

    public async Task<ApiResponse<DispatchSnapshotImportBatchDto>> CommitSnapshotImportAsync(long id, CommitDispatchSnapshotImportRequest request, CancellationToken ct)
    {
        await ValidateAsync(_commitImportValidator, request, ct);
        var result = await _repository.CommitSnapshotImportAsync(id, request, _currentUser.UserId, ct);
        await AuditAsync("SupplyChainImportBatches", id, "CommitDispatchImport", null, result, ct);
        return ApiResponse<DispatchSnapshotImportBatchDto>.Success(result, "Dispatch snapshot import committed.");
    }

    public async Task<ApiResponse> CancelSnapshotImportAsync(long id, CancelDispatchSnapshotImportRequest request, CancellationToken ct)
    {
        await ValidateAsync(_cancelImportValidator, request, ct);
        await _repository.CancelSnapshotImportAsync(id, request.Reason, _currentUser.UserId, ct);
        await AuditAsync("SupplyChainImportBatches", id, "CancelDispatchImport", null, request, ct);
        return ApiResponse.Success("Dispatch snapshot import cancelled.");
    }

    public async Task<ApiResponse<PagedResult<DispatchSnapshotImportBatchDto>>> GetSnapshotImportBatchesAsync(DispatchSnapshotImportBatchQuery query, CancellationToken ct)
    {
        await ValidateAsync(_importQueryValidator, query, ct);
        return ApiResponse<PagedResult<DispatchSnapshotImportBatchDto>>.Success(await _repository.GetSnapshotImportBatchesAsync(query, ct));
    }

    public async Task<ApiResponse<DispatchPlanningRunDto>> CreateRunAsync(CreateDispatchPlanningRunRequest request, CancellationToken ct)
    {
        await ValidateAsync(_createRunValidator, request, ct);
        var result = await _repository.CreateRunAsync(request, _currentUser.UserId, ct);
        await AuditAsync("DispatchPlanningRuns", result.Id, "Create", null, result, ct);
        return ApiResponse<DispatchPlanningRunDto>.Success(result, "Dispatch Planning draft created.");
    }

    public async Task<ApiResponse<DispatchPlanningRunDto>> CalculateRunAsync(long id, CancellationToken ct)
    {
        var inputs = await _repository.GetCalculationInputsAsync(id, ct);
        if (inputs.Count == 0) throw new CosmosException("No eligible mapped snapshot rows or active dispatch settings were found for this run.", 409);
        var calculation = _calculator.Calculate(id, inputs);
        var result = await _repository.SaveCalculationAsync(id, calculation.Recommendations, _currentUser.UserId, ct);
        await AuditAsync("DispatchPlanningRuns", id, "Calculate", null, new { DispatchCalculationService.CalculationVersion, LineCount = calculation.Recommendations.Count }, ct);
        _logger.LogInformation("Dispatch Planning run {RunId} calculated with {LineCount} recommendation rows by user {UserId}.", id, calculation.Recommendations.Count, _currentUser.UserId);
        return ApiResponse<DispatchPlanningRunDto>.Success(result, "Dispatch Planning run calculated.");
    }

    public async Task<ApiResponse<PagedResult<DispatchPlanningRunSummaryDto>>> GetRunsAsync(DispatchPlanningRunQuery query, CancellationToken ct)
    {
        await ValidateAsync(_runQueryValidator, query, ct);
        return ApiResponse<PagedResult<DispatchPlanningRunSummaryDto>>.Success(await _repository.GetRunsAsync(query, ct));
    }

    public async Task<ApiResponse<DispatchPlanningRunDto>> GetRunAsync(long id, CancellationToken ct)
    {
        var result = await _repository.GetRunAsync(id, ct) ?? throw new CosmosException("Dispatch Planning run was not found.", 404);
        return ApiResponse<DispatchPlanningRunDto>.Success(result);
    }

    public async Task<ApiResponse<IReadOnlyCollection<DispatchRecommendationDto>>> GetRecommendationsAsync(long runId, DispatchRecommendationQuery query, CancellationToken ct)
    {
        await ValidateAsync(_recommendationQueryValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<DispatchRecommendationDto>>.Success(await _repository.GetRecommendationsAsync(runId, query, ct));
    }

    public async Task<ApiResponse<DispatchRecommendationDto>> OverrideRecommendationAsync(long runId, long recommendationId, UpdateDispatchRecommendationRequest request, CancellationToken ct)
    {
        await ValidateAsync(_overrideValidator, request, ct);
        var result = await _repository.OverrideRecommendationAsync(runId, recommendationId, request, _currentUser.UserId, ct);
        await AuditAsync("DispatchRecommendationResults", recommendationId, "Override", null, new { runId, request, result.CalculatedRecommendationQuantity }, ct);
        return ApiResponse<DispatchRecommendationDto>.Success(result, "Dispatch recommendation override saved.");
    }

    public async Task<ApiResponse<DispatchPlanningRunDto>> AllocateAsync(long id, AllocateDispatchPlanningRunRequest request, CancellationToken ct)
    {
        await ValidateAsync(_allocateValidator, request, ct);
        var run = await _repository.GetRunAsync(id, ct) ?? throw new CosmosException("Dispatch Planning run was not found.", 404);
        var allocation = _allocationService.Allocate(run.Recommendations, run.CompanyStockSnapshots);
        var result = await _repository.AllocateAsync(id, allocation.Lines, request.Notes, _currentUser.UserId, ct);
        await AuditAsync("DispatchPlanningRuns", id, "Allocate", null, new { request.Notes, result.Status }, ct);
        return ApiResponse<DispatchPlanningRunDto>.Success(result, "Available company stock allocated.");
    }

    public async Task<ApiResponse<DispatchPlanningRunDto>> FinalizeAsync(long id, CancellationToken ct)
    {
        var result = await _repository.FinalizeAsync(id, _currentUser.UserId, ct);
        await AuditAsync("DispatchPlanningRuns", id, "Finalize", null, new { result.Status, result.FinalizedAtUtc }, ct);
        return ApiResponse<DispatchPlanningRunDto>.Success(result, "Dispatch Planning run finalized. Inventory was not mutated.");
    }

    public async Task<ApiResponse<DispatchPlanningRunDto>> CancelAsync(long id, CancelDispatchPlanningRunRequest request, CancellationToken ct)
    {
        await ValidateAsync(_cancelRunValidator, request, ct);
        var result = await _repository.CancelAsync(id, request.Reason, _currentUser.UserId, ct);
        await AuditAsync("DispatchPlanningRuns", id, "Cancel", null, request, ct);
        return ApiResponse<DispatchPlanningRunDto>.Success(result, "Dispatch Planning run cancelled.");
    }

    public async Task<ApiResponse<PagedResult<DispatchRecommendationReportRowDto>>> GetRecommendationReportAsync(DispatchRecommendationReportQuery query, CancellationToken ct)
    {
        await ValidateAsync(_reportValidator, query, ct);
        return ApiResponse<PagedResult<DispatchRecommendationReportRowDto>>.Success(await _repository.GetRecommendationReportAsync(query, ct));
    }

    private static async Task ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(request, ct);
        if (!result.IsValid) throw new ValidationException(result.Errors);
    }

    private async Task AuditAsync(string table, long id, string action, object? oldValues, object? newValues, CancellationToken ct) =>
        await _audit.AddAsync(new AuditEntryRequest(table, id.ToString(), action, Serialize(oldValues), Serialize(newValues), _currentUser.UserId), ct);

    private static string? Serialize(object? value) => value is null ? null : JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    private static string CreateSnapshotHash(long channelId, int importType, IReadOnlyCollection<DispatchSnapshotImportRowRequest> rows)
    {
        var payload = JsonSerializer.Serialize(new { ChannelId = channelId, ImportType = importType, Rows = rows }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}
