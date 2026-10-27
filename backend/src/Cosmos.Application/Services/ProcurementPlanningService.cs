using System.Text.Json;
using System.Text;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.ProcurementPlanning;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class ProcurementPlanningService : IProcurementPlanningService
{
    private readonly IProcurementPlanningRepository _repository;
    private readonly IProcurementCalculationService _calculator;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<ProcurementPlanningService> _logger;
    private readonly IValidator<ProcurementListQuery> _listValidator;
    private readonly IValidator<SaveSalesChannelRequest> _channelValidator;
    private readonly IValidator<ChannelSkuMappingQuery> _mappingListValidator;
    private readonly IValidator<SaveChannelSkuMappingRequest> _mappingValidator;
    private readonly IValidator<SalesImportBatchQuery> _batchListValidator;
    private readonly IValidator<CancelSalesImportBatchRequest> _cancelBatchValidator;
    private readonly IValidator<ManualSalesEntryRequest> _manualSalesValidator;
    private readonly IValidator<SalesHistoryQuery> _salesHistoryValidator;
    private readonly IValidator<SaveProductBomRequest> _bomValidator;
    private readonly IValidator<ProcurementSettingQuery> _settingListValidator;
    private readonly IValidator<SaveProcurementSettingRequest> _settingValidator;
    private readonly IValidator<CreateLeadTimeHistoryRequest> _leadTimeValidator;
    private readonly IValidator<PlanningRequest> _planningValidator;
    private readonly IValidator<PlanningRunQuery> _runListValidator;
    private readonly IValidator<PlanningRunLineQuery> _runLineListValidator;
    private readonly IValidator<UpdatePlanningLineRequest> _lineValidator;
    private readonly IValidator<CancelPlanningRunRequest> _cancelRunValidator;

    public ProcurementPlanningService(
        IProcurementPlanningRepository repository,
        IProcurementCalculationService calculator,
        IAuditRepository audit,
        ICurrentUser currentUser,
        ILogger<ProcurementPlanningService> logger,
        IValidator<ProcurementListQuery> listValidator,
        IValidator<SaveSalesChannelRequest> channelValidator,
        IValidator<ChannelSkuMappingQuery> mappingListValidator,
        IValidator<SaveChannelSkuMappingRequest> mappingValidator,
        IValidator<SalesImportBatchQuery> batchListValidator,
        IValidator<CancelSalesImportBatchRequest> cancelBatchValidator,
        IValidator<ManualSalesEntryRequest> manualSalesValidator,
        IValidator<SalesHistoryQuery> salesHistoryValidator,
        IValidator<SaveProductBomRequest> bomValidator,
        IValidator<ProcurementSettingQuery> settingListValidator,
        IValidator<SaveProcurementSettingRequest> settingValidator,
        IValidator<CreateLeadTimeHistoryRequest> leadTimeValidator,
        IValidator<PlanningRequest> planningValidator,
        IValidator<PlanningRunQuery> runListValidator,
        IValidator<PlanningRunLineQuery> runLineListValidator,
        IValidator<UpdatePlanningLineRequest> lineValidator,
        IValidator<CancelPlanningRunRequest> cancelRunValidator)
    {
        _repository = repository;
        _calculator = calculator;
        _audit = audit;
        _currentUser = currentUser;
        _logger = logger;
        _listValidator = listValidator;
        _channelValidator = channelValidator;
        _mappingListValidator = mappingListValidator;
        _mappingValidator = mappingValidator;
        _batchListValidator = batchListValidator;
        _cancelBatchValidator = cancelBatchValidator;
        _manualSalesValidator = manualSalesValidator;
        _salesHistoryValidator = salesHistoryValidator;
        _bomValidator = bomValidator;
        _settingListValidator = settingListValidator;
        _settingValidator = settingValidator;
        _leadTimeValidator = leadTimeValidator;
        _planningValidator = planningValidator;
        _runListValidator = runListValidator;
        _runLineListValidator = runLineListValidator;
        _lineValidator = lineValidator;
        _cancelRunValidator = cancelRunValidator;
    }

    private long? UserId => _currentUser.UserId;
    private int? AuditUserId => UserId is null ? null : checked((int)UserId.Value);

    public async Task<ApiResponse<PagedResult<SalesChannelDto>>> GetChannelsAsync(ProcurementListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, ct);
        return ApiResponse<PagedResult<SalesChannelDto>>.Success(await _repository.GetChannelsAsync(query, ct));
    }

    public async Task<ApiResponse<SalesChannelDto>> GetChannelAsync(long id, CancellationToken ct) =>
        ApiResponse<SalesChannelDto>.Success(Found(await _repository.GetChannelAsync(id, ct), "Sales channel"));

    public Task<ApiResponse<SalesChannelDto>> CreateChannelAsync(SaveSalesChannelRequest request, CancellationToken ct) => SaveChannelAsync(null, request, ct);
    public Task<ApiResponse<SalesChannelDto>> UpdateChannelAsync(long id, SaveSalesChannelRequest request, CancellationToken ct) => SaveChannelAsync(id, request, ct);

    private async Task<ApiResponse<SalesChannelDto>> SaveChannelAsync(long? id, SaveSalesChannelRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_channelValidator, request, ct);
        var before = id.HasValue ? await _repository.GetChannelAsync(id.Value, ct) : null;
        if (id.HasValue) Found(before, "Sales channel");
        var saved = await _repository.SaveChannelAsync(id, request with { Code = request.Code.Trim().ToUpperInvariant(), Name = request.Name.Trim() }, UserId, ct);
        await AuditAsync("SalesChannels", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<SalesChannelDto>.Success(saved, id.HasValue ? "Sales channel updated." : "Sales channel created.");
    }

    public async Task<ApiResponse> SetChannelStatusAsync(long id, ChangeActiveStatusRequest request, CancellationToken ct)
    {
        var before = Found(await _repository.GetChannelAsync(id, ct), "Sales channel");
        await _repository.SetChannelStatusAsync(id, request.IsActive, UserId, ct);
        var after = Found(await _repository.GetChannelAsync(id, ct), "Sales channel");
        await AuditAsync("SalesChannels", id, request.IsActive ? "Activate" : "Deactivate", before, after, ct);
        return ApiResponse.Success(request.IsActive ? "Sales channel activated." : "Sales channel deactivated.");
    }

    public async Task<ApiResponse<PagedResult<ChannelSkuMappingDto>>> GetSkuMappingsAsync(ChannelSkuMappingQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_mappingListValidator, query, ct);
        return ApiResponse<PagedResult<ChannelSkuMappingDto>>.Success(await _repository.GetSkuMappingsAsync(query, ct));
    }

    public async Task<ApiResponse<ChannelSkuMappingDto>> GetSkuMappingAsync(long id, CancellationToken ct) =>
        ApiResponse<ChannelSkuMappingDto>.Success(Found(await _repository.GetSkuMappingAsync(id, ct), "Channel SKU mapping"));

    public Task<ApiResponse<ChannelSkuMappingDto>> CreateSkuMappingAsync(SaveChannelSkuMappingRequest request, CancellationToken ct) => SaveMappingAsync(null, request, ct);
    public Task<ApiResponse<ChannelSkuMappingDto>> UpdateSkuMappingAsync(long id, SaveChannelSkuMappingRequest request, CancellationToken ct) => SaveMappingAsync(id, request, ct);

    private async Task<ApiResponse<ChannelSkuMappingDto>> SaveMappingAsync(long? id, SaveChannelSkuMappingRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_mappingValidator, request, ct);
        var before = id.HasValue ? await _repository.GetSkuMappingAsync(id.Value, ct) : null;
        if (id.HasValue) Found(before, "Channel SKU mapping");
        var normalized = request with { ChannelSku = request.ChannelSku.Trim(), ChannelProductName = TrimToNull(request.ChannelProductName) };
        var saved = await _repository.SaveSkuMappingAsync(id, normalized, UserId, ct);
        await AuditAsync("ChannelSkuMappings", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<ChannelSkuMappingDto>.Success(saved, id.HasValue ? "Channel SKU mapping updated." : "Channel SKU mapping created.");
    }

    public async Task<ApiResponse> SetSkuMappingStatusAsync(long id, ChangeActiveStatusRequest request, CancellationToken ct)
    {
        var before = Found(await _repository.GetSkuMappingAsync(id, ct), "Channel SKU mapping");
        await _repository.SetSkuMappingStatusAsync(id, request.IsActive, UserId, ct);
        var after = Found(await _repository.GetSkuMappingAsync(id, ct), "Channel SKU mapping");
        await AuditAsync("ChannelSkuMappings", id, request.IsActive ? "Activate" : "Deactivate", before, after, ct);
        return ApiResponse.Success(request.IsActive ? "Channel SKU mapping activated." : "Channel SKU mapping deactivated.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<UnmappedChannelSkuDto>>> GetUnmappedSkusAsync(CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<UnmappedChannelSkuDto>>.Success(await _repository.GetUnmappedSkusAsync(ct));

    public ProcurementExportFileDto BuildImportTemplate() =>
        new("procurement-sales-import-template.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ProcurementXlsxWriter.CreateImportTemplate());

    public async Task<ApiResponse<SalesImportPreviewDto>> PreviewImportAsync(string fileName, byte[] content, CancellationToken ct) =>
        ApiResponse<SalesImportPreviewDto>.Success(await BuildImportPreviewAsync(fileName, content, ct));

    public async Task<ApiResponse<SalesImportConfirmResultDto>> ConfirmImportAsync(string fileName, byte[] content, bool allowDuplicate, string? correctionReason, CancellationToken ct)
    {
        var preview = await BuildImportPreviewAsync(fileName, content, ct);
        ProcurementSalesImportPolicy.ValidateConfirmation(preview, allowDuplicate, correctionReason);

        var confirmed = preview.Rows.Select(x => new ConfirmedSalesImportRow(
            x.RowNumber,
            x.SalesDate!.Value,
            x.SalesChannelId!.Value,
            x.ChannelSku!,
            x.ChannelProductName,
            x.ItemId,
            x.Quantity!.Value,
            JsonSerializer.Serialize(new { x.RowNumber, x.SalesDate, x.ChannelCode, x.ChannelSku, x.ChannelProductName, x.Quantity }))).ToArray();
        var saved = await _repository.ConfirmImportAsync(fileName, preview.FileHash, allowDuplicate, TrimToNull(correctionReason), confirmed, UserId, ct);
        _logger.LogInformation("Confirmed procurement sales import batch {BatchId} with {RowCount} rows and {UnmappedCount} unmapped rows.", saved.BatchId, saved.ImportedRows, saved.UnmappedRows);
        await AuditAsync("ProcurementSalesImportBatches", saved.BatchId, "Import", null, saved, ct);
        return ApiResponse<SalesImportConfirmResultDto>.Success(saved, "Sales import completed.");
    }

    private async Task<SalesImportPreviewDto> BuildImportPreviewAsync(string fileName, byte[] content, CancellationToken ct)
    {
        IReadOnlyCollection<ParsedSalesImportRow> parsed;
        try { parsed = ProcurementSalesImportParser.Parse(fileName, content); }
        catch (Exception ex) when (ex is InvalidDataException or DecoderFallbackException)
        { throw new CosmosException(ex.Message, 400); }

        var lookup = await _repository.GetImportLookupAsync(ct);
        var channels = lookup.GroupBy(x => x.ChannelCode, StringComparer.OrdinalIgnoreCase).ToDictionary(x => x.Key, x => x.First().SalesChannelId, StringComparer.OrdinalIgnoreCase);
        var mappings = lookup.Where(x => x.ChannelSku is not null).ToDictionary(x => $"{x.SalesChannelId}|{x.ChannelSku}", x => x, StringComparer.OrdinalIgnoreCase);
        var rows = new List<SalesImportRowPreviewDto>();
        foreach (var row in parsed)
        {
            var errors = row.Errors.ToList();
            long? channelId = null;
            ImportLookupRow? mapping = null;
            if (!string.IsNullOrWhiteSpace(row.ChannelCode))
            {
                if (!channels.TryGetValue(row.ChannelCode, out var resolvedChannel)) errors.Add($"Unknown or inactive sales channel '{row.ChannelCode}'.");
                else
                {
                    channelId = resolvedChannel;
                    if (!string.IsNullOrWhiteSpace(row.ChannelSku)) mappings.TryGetValue($"{resolvedChannel}|{row.ChannelSku}", out mapping);
                }
            }

            rows.Add(new SalesImportRowPreviewDto(
                row.RowNumber, row.SalesDate, row.ChannelCode?.ToUpperInvariant(), row.ChannelSku, row.ChannelProductName, row.Quantity,
                channelId, mapping?.ItemId, mapping?.ItemCode, mapping?.ItemName, errors));
        }

        var hash = ProcurementSalesImportParser.ComputeHash(content);
        return new SalesImportPreviewDto(
            fileName,
            hash,
            rows.Count,
            rows.Count(x => x.IsValid),
            rows.Count(x => !x.IsValid),
            rows.Count(x => x.IsValid && !x.IsMapped),
            await _repository.ImportFileExistsAsync(hash, ct),
            rows);
    }

    public async Task<ApiResponse<PagedResult<SalesImportBatchDto>>> GetImportBatchesAsync(SalesImportBatchQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_batchListValidator, query, ct);
        return ApiResponse<PagedResult<SalesImportBatchDto>>.Success(await _repository.GetImportBatchesAsync(query, ct));
    }

    public async Task<ApiResponse<SalesImportBatchDetailsDto>> GetImportBatchAsync(long id, CancellationToken ct)
    {
        var batch = Found(await _repository.GetImportBatchAsync(id, ct), "Sales import batch");
        var rows = await _repository.GetImportBatchRowsAsync(id, ct);
        return ApiResponse<SalesImportBatchDetailsDto>.Success(new SalesImportBatchDetailsDto(batch, rows));
    }

    public async Task<ApiResponse> CancelImportBatchAsync(long id, CancelSalesImportBatchRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_cancelBatchValidator, request, ct);
        var before = Found(await _repository.GetImportBatchAsync(id, ct), "Sales import batch");
        await _repository.CancelImportBatchAsync(id, request.Reason.Trim(), UserId, ct);
        var after = Found(await _repository.GetImportBatchAsync(id, ct), "Sales import batch");
        await AuditAsync("ProcurementSalesImportBatches", id, "Cancel", before, after, ct);
        return ApiResponse.Success("Sales import batch cancelled; its sales rows no longer participate in planning.");
    }

    public Task<ApiResponse<SalesHistoryDto>> CreateManualSalesAsync(ManualSalesEntryRequest request, CancellationToken ct) => SaveManualSalesAsync(null, request, ct);
    public Task<ApiResponse<SalesHistoryDto>> UpdateManualSalesAsync(long id, ManualSalesEntryRequest request, CancellationToken ct) => SaveManualSalesAsync(id, request, ct);

    private async Task<ApiResponse<SalesHistoryDto>> SaveManualSalesAsync(long? id, ManualSalesEntryRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_manualSalesValidator, request, ct);
        var before = id.HasValue ? await _repository.GetSalesHistoryByIdAsync(id.Value, ct) : null;
        var saved = await _repository.SaveManualSalesAsync(id, request with { ChannelSku = request.ChannelSku.Trim(), ChannelProductName = TrimToNull(request.ChannelProductName), Notes = TrimToNull(request.Notes) }, UserId, ct);
        await AuditAsync("ProcurementSalesHistory", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<SalesHistoryDto>.Success(saved, id.HasValue ? "Manual sales entry updated." : "Manual sales entry created.");
    }

    public async Task<ApiResponse> DeleteManualSalesAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetSalesHistoryByIdAsync(id, ct), "Manual sales entry");
        await _repository.DeleteManualSalesAsync(id, UserId, ct);
        await AuditAsync("ProcurementSalesHistory", id, "Delete", before, null, ct);
        return ApiResponse.Success("Manual sales entry deleted.");
    }

    public async Task<ApiResponse<PagedResult<SalesHistoryDto>>> GetSalesHistoryAsync(SalesHistoryQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_salesHistoryValidator, query, ct);
        return ApiResponse<PagedResult<SalesHistoryDto>>.Success(await _repository.GetSalesHistoryAsync(query, ct));
    }

    public async Task<ApiResponse<ProductSalesSummaryDto>> GetSalesSummaryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_planningValidator, new PlanningRequest(fromDate, toDate), ct);
        var channels = await _repository.GetSummaryChannelsAsync(ct);
        var flat = await _repository.GetSalesSummaryAsync(fromDate, toDate, ct);
        return ApiResponse<ProductSalesSummaryDto>.Success(ProcurementSalesSummaryBuilder.Build(fromDate, toDate, channels, flat));
    }

    public async Task<ApiResponse<ProductBomDto>> GetProductBomAsync(long productId, CancellationToken ct) =>
        ApiResponse<ProductBomDto>.Success(Found(await _repository.GetProductBomAsync(productId, ct), "Finished product"));

    public async Task<ApiResponse<ProductBomDto>> SaveProductBomAsync(long productId, SaveProductBomRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_bomValidator, request, ct);
        if (request.Components.Any(x => x.ComponentItemId == productId)) throw new CosmosException("A finished product cannot be its own BOM component.");
        var before = await _repository.GetProductBomAsync(productId, ct);
        var saved = await _repository.SaveProductBomAsync(productId, request, UserId, ct);
        await AuditAsync("ProductBomComponents", productId, "Replace", before, saved, ct);
        return ApiResponse<ProductBomDto>.Success(saved, "Product BOM saved.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>> GetBomIssuesAsync(CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>.Success(await _repository.GetBomIssuesAsync(ct));

    public async Task<ApiResponse<PagedResult<ProcurementSettingDto>>> GetSettingsAsync(ProcurementSettingQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_settingListValidator, query, ct);
        return ApiResponse<PagedResult<ProcurementSettingDto>>.Success(await _repository.GetSettingsAsync(query, ct));
    }

    public async Task<ApiResponse<ProcurementSettingDto>> GetSettingByItemAsync(long itemId, CancellationToken ct) =>
        ApiResponse<ProcurementSettingDto>.Success(Found(await _repository.GetSettingByItemAsync(itemId, ct), "Procurement setting"));

    public async Task<ApiResponse<ProcurementSettingDto>> SaveSettingAsync(SaveProcurementSettingRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_settingValidator, request, ct);
        var before = await _repository.GetSettingByItemAsync(request.ItemId, ct);
        var saved = await _repository.SaveSettingAsync(request, UserId, ct);
        await AuditAsync("ProcurementSettings", saved.Id, before is null ? "Create" : "Update", before, saved, ct);
        return ApiResponse<ProcurementSettingDto>.Success(saved, "Procurement settings saved.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>> GetMissingSettingsAsync(CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<ProcurementConfigurationIssueDto>>.Success(await _repository.GetMissingSettingsAsync(ct));

    public async Task<ApiResponse<LeadTimeHistoryDto>> AddLeadTimeHistoryAsync(CreateLeadTimeHistoryRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_leadTimeValidator, request, ct);
        var saved = await _repository.AddLeadTimeHistoryAsync(request, UserId, ct);
        await AuditAsync("ProcurementLeadTimeHistory", saved.Id, "Create", null, saved, ct);
        return ApiResponse<LeadTimeHistoryDto>.Success(saved, "Lead-time history added.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<LeadTimeHistoryDto>>> GetLeadTimeHistoryAsync(long itemId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<LeadTimeHistoryDto>>.Success(await _repository.GetLeadTimeHistoryAsync(itemId, ct));

    public async Task<ApiResponse<PlanningValidationDto>> ValidatePlanningAsync(PlanningRequest request, CancellationToken ct)
    {
        var preview = await CalculateAsync(request, ct);
        return ApiResponse<PlanningValidationDto>.Success(preview.Validation);
    }

    public async Task<ApiResponse<PlanningPreviewDto>> PreviewPlanningAsync(PlanningRequest request, CancellationToken ct) =>
        ApiResponse<PlanningPreviewDto>.Success(await CalculateAsync(request, ct));

    private async Task<PlanningPreviewDto> CalculateAsync(PlanningRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_planningValidator, request, ct);
        var data = await _repository.GetCalculationDataAsync(request.FromDate, request.ToDate, ct);
        var result = _calculator.Calculate(data, request.FromDate, request.ToDate);
        return new PlanningPreviewDto(request.FromDate, request.ToDate, request.ToDate.DayNumber - request.FromDate.DayNumber + 1, DateTime.UtcNow, result.Validation, result.Lines) { SourceRevision = data.SourceRevision };
    }

    public async Task<ApiResponse<PlanningRunDto>> SavePlanningRunAsync(PlanningRequest request, CancellationToken ct)
    {
        var preview = await CalculateAsync(request, ct);
        if (!preview.Validation.CanCalculate)
            throw new CosmosException("Planning prerequisites contain blocking errors.", 409, preview.Validation.BlockingErrors.Select(x => $"{x.Code}: {x.Message}"));
        var model = new PlanningRunSaveModel(request.FromDate, request.ToDate, preview.NumberOfDays, preview.CalculatedAtUtc, TrimToNull(request.Notes), ProcurementCalculationService.CalculationVersion, ProcurementCalculationService.InventoryBasis, preview.Lines) { SourceRevision = preview.SourceRevision };
        var saved = await _repository.SavePlanningRunAsync(model, UserId, ct);
        await AuditAsync("ProcurementPlanningRuns", saved.Id, "Calculate", null, saved, ct);
        return ApiResponse<PlanningRunDto>.Success(saved, "Planning run saved as draft.");
    }

    public async Task<ApiResponse<PagedResult<PlanningRunSummaryDto>>> GetPlanningRunsAsync(PlanningRunQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_runListValidator, query, ct);
        return ApiResponse<PagedResult<PlanningRunSummaryDto>>.Success(await _repository.GetPlanningRunsAsync(query, ct));
    }

    public async Task<ApiResponse<PlanningRunDto>> GetPlanningRunAsync(long id, CancellationToken ct) =>
        ApiResponse<PlanningRunDto>.Success(Found(await _repository.GetPlanningRunAsync(id, ct), "Planning run"));

    public async Task<ApiResponse<IReadOnlyCollection<PlanningRunLineDto>>> GetPlanningRunLinesAsync(long id, PlanningRunLineQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_runLineListValidator, query, ct);
        Found(await _repository.GetPlanningRunAsync(id, ct), "Planning run");
        return ApiResponse<IReadOnlyCollection<PlanningRunLineDto>>.Success(await _repository.GetPlanningRunLinesAsync(id, query, ct));
    }

    public async Task<ApiResponse<PlanningRunLineDto>> UpdatePlanningLineAsync(long runId, long lineId, UpdatePlanningLineRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_lineValidator, request, ct);
        var run = Found(await _repository.GetPlanningRunAsync(runId, ct), "Planning run");
        var before = run.Lines.FirstOrDefault(x => x.Id == lineId) ?? throw new NotFoundException("Planning run line was not found.");
        var saved = await _repository.UpdatePlanningLineAsync(runId, lineId, request with { AdjustmentReason = TrimToNull(request.AdjustmentReason) }, UserId, ct);
        await AuditAsync("ProcurementPlanningRunLines", lineId, "Adjust", before, saved, ct);
        return ApiResponse<PlanningRunLineDto>.Success(saved, "Planning quantity updated.");
    }

    public async Task<ApiResponse<PlanningRunDto>> FinalizePlanningRunAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetPlanningRunAsync(id, ct), "Planning run");
        var saved = await _repository.FinalizePlanningRunAsync(id, UserId, ct);
        await AuditAsync("ProcurementPlanningRuns", id, "Finalize", before, saved, ct);
        return ApiResponse<PlanningRunDto>.Success(saved, "Planning run finalized.");
    }

    public async Task<ApiResponse<PlanningRunDto>> CancelPlanningRunAsync(long id, CancelPlanningRunRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_cancelRunValidator, request, ct);
        var before = Found(await _repository.GetPlanningRunAsync(id, ct), "Planning run");
        var saved = await _repository.CancelPlanningRunAsync(id, request.Reason.Trim(), UserId, ct);
        await AuditAsync("ProcurementPlanningRuns", id, "Cancel", before, new { Saved = saved, request.Reason }, ct);
        return ApiResponse<PlanningRunDto>.Success(saved, "Planning run cancelled.");
    }

    public async Task<ProcurementExportFileDto> ExportPlanningRunAsync(long id, CancellationToken ct)
    {
        var run = Found(await _repository.GetPlanningRunAsync(id, ct), "Planning run");
        var content = ProcurementXlsxWriter.CreatePlanningRunWorkbook(run, _currentUser.Username ?? _currentUser.Email ?? "Unknown user");
        return new ProcurementExportFileDto($"procurement-plan-{run.RunNumber}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);
    }

    private static T Found<T>(T? value, string name) where T : class => value ?? throw new NotFoundException($"{name} was not found.");
    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private Task AuditAsync(string table, long id, string action, object? before, object? after, CancellationToken ct) =>
        _audit.AddAsync(new AuditEntryRequest(table, id.ToString(), action, before is null ? null : AuditSerializer.Serialize(before), after is null ? null : AuditSerializer.Serialize(after), AuditUserId), ct);
}
