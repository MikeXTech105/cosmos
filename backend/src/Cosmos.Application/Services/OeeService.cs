using System.Text;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Oee;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Oee;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class OeeService : IOeeService
{
    private readonly IOeeRepository _repository;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUser _user;
    private readonly ILogger<OeeService> _logger;
    private readonly IValidator<OeeMasterListQuery> _masterListValidator;
    private readonly IValidator<CreateOeeMachineRequest> _machineValidator;
    private readonly IValidator<CreateOeeMouldRequest> _mouldValidator;
    private readonly IValidator<CreateOeeDowntimeReasonRequest> _reasonValidator;
    private readonly IValidator<BulkCreateOeeProductionEntriesRequest> _bulkValidator;
    private readonly IValidator<UpdateOeeProductionEntryRequest> _entryValidator;
    private readonly IValidator<OeeProductionEntryListQuery> _entryListValidator;
    private readonly IValidator<OeeDashboardQuery> _dashboardValidator;
    private readonly IValidator<OeeReportQuery> _reportValidator;

    public OeeService(
        IOeeRepository repository,
        IAuditRepository audit,
        ICurrentUser user,
        ILogger<OeeService> logger,
        IValidator<OeeMasterListQuery> masterListValidator,
        IValidator<CreateOeeMachineRequest> machineValidator,
        IValidator<CreateOeeMouldRequest> mouldValidator,
        IValidator<CreateOeeDowntimeReasonRequest> reasonValidator,
        IValidator<BulkCreateOeeProductionEntriesRequest> bulkValidator,
        IValidator<UpdateOeeProductionEntryRequest> entryValidator,
        IValidator<OeeProductionEntryListQuery> entryListValidator,
        IValidator<OeeDashboardQuery> dashboardValidator,
        IValidator<OeeReportQuery> reportValidator)
    {
        _repository = repository;
        _audit = audit;
        _user = user;
        _logger = logger;
        _masterListValidator = masterListValidator;
        _machineValidator = machineValidator;
        _mouldValidator = mouldValidator;
        _reasonValidator = reasonValidator;
        _bulkValidator = bulkValidator;
        _entryValidator = entryValidator;
        _entryListValidator = entryListValidator;
        _dashboardValidator = dashboardValidator;
        _reportValidator = reportValidator;
    }

    private long? UserId => _user.UserId;
    private int? AuditUserId => UserId is null ? null : checked((int)UserId.Value);

    public async Task<ApiResponse<PagedResult<OeeMachineDto>>> GetMachinesAsync(OeeMasterListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_masterListValidator, query, ct);
        return ApiResponse<PagedResult<OeeMachineDto>>.Success(await _repository.GetMachinesAsync(query, ct));
    }

    public async Task<ApiResponse<OeeMachineDto>> GetMachineAsync(long id, CancellationToken ct) =>
        ApiResponse<OeeMachineDto>.Success(Found(await _repository.GetMachineAsync(id, ct), "OEE machine"));

    public async Task<ApiResponse<OeeMachineDto>> CreateMachineAsync(CreateOeeMachineRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_machineValidator, request, ct);
        var saved = await _repository.SaveMachineAsync(null, request, UserId, ct);
        await AuditAsync("OeeMachines", saved.Id, "Create", null, saved, ct);
        return ApiResponse<OeeMachineDto>.Success(saved, "OEE machine created.");
    }

    public async Task<ApiResponse<OeeMachineDto>> UpdateMachineAsync(long id, UpdateOeeMachineRequest request, CancellationToken ct)
    {
        var mapped = new CreateOeeMachineRequest(request.MachineCode, request.MachineName, request.Tonnage, request.Location, request.DisplayOrder, request.IsActive);
        await ValidationRunner.ValidateAsync(_machineValidator, mapped, ct);
        var old = Found(await _repository.GetMachineAsync(id, ct), "OEE machine");
        var saved = await _repository.SaveMachineAsync(id, mapped, UserId, ct);
        await AuditAsync("OeeMachines", id, "Update", old, saved, ct);
        return ApiResponse<OeeMachineDto>.Success(saved, "OEE machine updated.");
    }

    public async Task<ApiResponse> DeleteMachineAsync(long id, CancellationToken ct)
    {
        var old = Found(await _repository.GetMachineAsync(id, ct), "OEE machine");
        await _repository.DeleteMachineAsync(id, UserId, ct);
        await AuditAsync("OeeMachines", id, "Delete", old, null, ct);
        return ApiResponse.Success("OEE machine deleted.");
    }

    public async Task<ApiResponse<PagedResult<OeeMouldDto>>> GetMouldsAsync(OeeMasterListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_masterListValidator, query, ct);
        return ApiResponse<PagedResult<OeeMouldDto>>.Success(await _repository.GetMouldsAsync(query, ct));
    }

    public async Task<ApiResponse<OeeMouldDto>> GetMouldAsync(long id, CancellationToken ct) =>
        ApiResponse<OeeMouldDto>.Success(Found(await _repository.GetMouldAsync(id, ct), "OEE mould"));

    public async Task<ApiResponse<OeeMouldDto>> CreateMouldAsync(CreateOeeMouldRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_mouldValidator, request, ct);
        var saved = await _repository.SaveMouldAsync(null, request, UserId, ct);
        await AuditAsync("OeeMoulds", saved.Id, "Create", null, saved, ct);
        return ApiResponse<OeeMouldDto>.Success(saved, "OEE mould created.");
    }

    public async Task<ApiResponse<OeeMouldDto>> UpdateMouldAsync(long id, UpdateOeeMouldRequest request, CancellationToken ct)
    {
        var mapped = new CreateOeeMouldRequest(request.MouldName, request.TargetShotPerDay, request.Cavity, request.CycleTime, request.IsActive);
        await ValidationRunner.ValidateAsync(_mouldValidator, mapped, ct);
        var old = Found(await _repository.GetMouldAsync(id, ct), "OEE mould");
        var saved = await _repository.SaveMouldAsync(id, mapped, UserId, ct);
        await AuditAsync("OeeMoulds", id, "Update", old, saved, ct);
        return ApiResponse<OeeMouldDto>.Success(saved, "OEE mould updated.");
    }

    public async Task<ApiResponse> DeleteMouldAsync(long id, CancellationToken ct)
    {
        var old = Found(await _repository.GetMouldAsync(id, ct), "OEE mould");
        await _repository.DeleteMouldAsync(id, UserId, ct);
        await AuditAsync("OeeMoulds", id, "Delete", old, null, ct);
        return ApiResponse.Success("OEE mould deleted.");
    }

    public async Task<ApiResponse<PagedResult<OeeDowntimeReasonDto>>> GetDowntimeReasonsAsync(OeeMasterListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_masterListValidator, query, ct);
        return ApiResponse<PagedResult<OeeDowntimeReasonDto>>.Success(await _repository.GetDowntimeReasonsAsync(query, ct));
    }

    public async Task<ApiResponse<OeeDowntimeReasonDto>> GetDowntimeReasonAsync(long id, CancellationToken ct) =>
        ApiResponse<OeeDowntimeReasonDto>.Success(Found(await _repository.GetDowntimeReasonAsync(id, ct), "OEE downtime reason"));

    public async Task<ApiResponse<OeeDowntimeReasonDto>> CreateDowntimeReasonAsync(CreateOeeDowntimeReasonRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_reasonValidator, request, ct);
        var saved = await _repository.SaveDowntimeReasonAsync(null, request, UserId, ct);
        await AuditAsync("OeeDowntimeReasons", saved.Id, "Create", null, saved, ct);
        return ApiResponse<OeeDowntimeReasonDto>.Success(saved, "OEE downtime reason created.");
    }

    public async Task<ApiResponse<OeeDowntimeReasonDto>> UpdateDowntimeReasonAsync(long id, UpdateOeeDowntimeReasonRequest request, CancellationToken ct)
    {
        var mapped = new CreateOeeDowntimeReasonRequest(request.ReasonName, request.IsActive);
        await ValidationRunner.ValidateAsync(_reasonValidator, mapped, ct);
        var old = Found(await _repository.GetDowntimeReasonAsync(id, ct), "OEE downtime reason");
        var saved = await _repository.SaveDowntimeReasonAsync(id, mapped, UserId, ct);
        await AuditAsync("OeeDowntimeReasons", id, "Update", old, saved, ct);
        return ApiResponse<OeeDowntimeReasonDto>.Success(saved, "OEE downtime reason updated.");
    }

    public async Task<ApiResponse> DeleteDowntimeReasonAsync(long id, CancellationToken ct)
    {
        var old = Found(await _repository.GetDowntimeReasonAsync(id, ct), "OEE downtime reason");
        await _repository.DeleteDowntimeReasonAsync(id, UserId, ct);
        await AuditAsync("OeeDowntimeReasons", id, "Delete", old, null, ct);
        return ApiResponse.Success("OEE downtime reason deleted.");
    }

    public async Task<ApiResponse<PagedResult<OeeProductionEntryDto>>> GetProductionEntriesAsync(OeeProductionEntryListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_entryListValidator, query, ct);
        return ApiResponse<PagedResult<OeeProductionEntryDto>>.Success(await _repository.GetProductionEntriesAsync(query, ct));
    }

    public async Task<ApiResponse<OeeProductionEntryDto>> GetProductionEntryAsync(long id, CancellationToken ct) =>
        ApiResponse<OeeProductionEntryDto>.Success(Found(await _repository.GetProductionEntryAsync(id, ct), "OEE production entry"));

    public async Task<ApiResponse<IReadOnlyCollection<OeeProductionEntryDto>>> CreateBulkProductionEntriesAsync(BulkCreateOeeProductionEntriesRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_bulkValidator, request, ct);
        _logger.LogInformation("Saving {EntryCount} OEE production entries for {ProductionDate}", request.Entries.Count, request.ProductionDate);
        var saved = await _repository.SaveBulkProductionEntriesAsync(request, UserId, ct);
        await AuditAsync("OeeProductionEntries", request.ProductionDate.ToString("yyyy-MM-dd"), "BulkCreate", null, saved, ct);
        return ApiResponse<IReadOnlyCollection<OeeProductionEntryDto>>.Success(saved, "OEE production entries saved.");
    }

    public async Task<ApiResponse<OeeProductionEntryDto>> UpdateProductionEntryAsync(long id, UpdateOeeProductionEntryRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_entryValidator, request, ct);
        var old = Found(await _repository.GetProductionEntryAsync(id, ct), "OEE production entry");
        var saved = await _repository.SaveProductionEntryAsync(id, request, UserId, ct);
        await AuditAsync("OeeProductionEntries", id, "Update", old, saved, ct);
        return ApiResponse<OeeProductionEntryDto>.Success(saved, "OEE production entry updated.");
    }

    public async Task<ApiResponse> DeleteProductionEntryAsync(long id, CancellationToken ct)
    {
        var old = Found(await _repository.GetProductionEntryAsync(id, ct), "OEE production entry");
        await _repository.DeleteProductionEntryAsync(id, UserId, ct);
        await AuditAsync("OeeProductionEntries", id, "Delete", old, null, ct);
        return ApiResponse.Success("OEE production entry deleted.");
    }

    public async Task<ApiResponse<OeeDashboardSummaryDto>> GetDashboardSummaryAsync(OeeDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_dashboardValidator, query, ct);
        return ApiResponse<OeeDashboardSummaryDto>.Success(await _repository.GetDashboardSummaryAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>> GetMachineWiseAsync(OeeDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_dashboardValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>.Success(await _repository.GetMachineWiseAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>> GetMouldWiseAsync(OeeDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_dashboardValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>.Success(await _repository.GetMouldWiseAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>> GetTopDowntimeReasonsAsync(OeeDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_dashboardValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>.Success(await _repository.GetTopDowntimeReasonsAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeDailyTrendDto>>> GetDailyTrendAsync(OeeDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_dashboardValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeDailyTrendDto>>.Success(await _repository.GetDailyTrendAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeDailyReportDto>>> GetDailyReportAsync(OeeReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_reportValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeDailyReportDto>>.Success(await _repository.GetDailyReportAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>> GetMachinePerformanceReportAsync(OeeReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_reportValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeMachineWiseDto>>.Success(await _repository.GetMachinePerformanceReportAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>> GetMouldPerformanceReportAsync(OeeReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_reportValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeMouldWiseDto>>.Success(await _repository.GetMouldPerformanceReportAsync(query, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>> GetDowntimeReportAsync(OeeReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_reportValidator, query, ct);
        return ApiResponse<IReadOnlyCollection<OeeDowntimeReasonSummaryDto>>.Success(await _repository.GetDowntimeReportAsync(query, ct));
    }

    public async Task<OeeExportFileDto> ExportDailyReportAsync(OeeReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_reportValidator, query, ct);
        var rows = await _repository.GetDailyReportAsync(query, ct);
        var workbook = BuildExcelHtml(rows);
        return new OeeExportFileDto($"oee-daily-report-{DateTime.UtcNow:yyyyMMddHHmmss}.xls", "application/vnd.ms-excel", Encoding.UTF8.GetBytes(workbook));
    }

    private static T Found<T>(T? value, string name) where T : class => value ?? throw new NotFoundException($"{name} was not found.");

    private Task AuditAsync(string table, long id, string action, object? before, object? after, CancellationToken ct) => AuditAsync(table, id.ToString(), action, before, after, ct);

    private Task AuditAsync(string table, string id, string action, object? before, object? after, CancellationToken ct) =>
        _audit.AddAsync(new AuditEntryRequest(
            table,
            id,
            action,
            before is null ? null : AuditSerializer.Serialize(before),
            after is null ? null : AuditSerializer.Serialize(after),
            AuditUserId), ct);

    private static string BuildExcelHtml(IEnumerable<OeeDailyReportDto> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine("<html><head><meta charset=\"utf-8\"><style>td,th{border:1px solid #999;padding:4px;}th{background:#e6f0ff;}</style></head><body>");
        builder.AppendLine("<table>");
        builder.AppendLine("<tr><th>Production Date</th><th>Machine Code</th><th>Machine Name</th><th>Mould Name</th><th>Machine On Time</th><th>Shot Count</th><th>Target Shot</th><th>OEE %</th><th>Downtime Reason</th><th>Remarks</th></tr>");
        foreach (var row in rows)
        {
            builder.Append("<tr>");
            AppendCell(builder, row.ProductionDate.ToString("yyyy-MM-dd"));
            AppendCell(builder, row.MachineCode);
            AppendCell(builder, row.MachineName);
            AppendCell(builder, row.MouldName);
            AppendCell(builder, row.MachineOnTime);
            AppendCell(builder, row.ShotCount);
            AppendCell(builder, row.CalculatedTargetShot);
            AppendCell(builder, row.CalculatedOeePercentage);
            AppendCell(builder, row.DowntimeReasonName);
            AppendCell(builder, row.Remarks);
            builder.AppendLine("</tr>");
        }

        builder.AppendLine("</table></body></html>");
        return builder.ToString();
    }

    private static void AppendCell(StringBuilder builder, object? value)
    {
        builder.Append("<td>").Append(Html(value?.ToString())).Append("</td>");
    }

    private static string Html(string? value)
    {
        value ??= "";
        return value
            .Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal)
            .Replace("\"", "&quot;", StringComparison.Ordinal);
    }
}
