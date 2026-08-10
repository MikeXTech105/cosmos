using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using FluentValidation;

namespace Cosmos.Application.Services;

public sealed class ActivityLogService : IActivityLogService
{
    private const int MaxExportRows = 50_000;
    private readonly IAuditRepository _repository;
    private readonly IValidator<ActivityLogListQuery> _listValidator;
    private readonly IValidator<ActivityLogExportRequest> _exportValidator;

    public ActivityLogService(
        IAuditRepository repository,
        IValidator<ActivityLogListQuery> listValidator,
        IValidator<ActivityLogExportRequest> exportValidator)
    {
        _repository = repository;
        _listValidator = listValidator;
        _exportValidator = exportValidator;
    }

    public async Task<ApiResponse<PagedResult<ActivityLogListItemDto>>> GetListAsync(ActivityLogListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, ct);
        return ApiResponse<PagedResult<ActivityLogListItemDto>>.Success(await _repository.GetListAsync(Normalize(query), ct));
    }

    public async Task<ApiResponse<ActivityLogDetailDto>> GetByIdAsync(long id, CancellationToken ct)
    {
        if (id <= 0) throw new NotFoundException("Activity log entry was not found.");
        var row = await _repository.GetByIdAsync(id, ct) ?? throw new NotFoundException("Activity log entry was not found.");
        return ApiResponse<ActivityLogDetailDto>.Success(ActivityLogMapper.ToDetail(row));
    }

    public async Task<ApiResponse<IReadOnlyCollection<ActivityLogExportDto>>> ExportAsync(ActivityLogExportRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_exportValidator, request, ct);
        var rows = await _repository.ExportAsync(Normalize(request), MaxExportRows, ct);
        await _repository.AddAsync(new AuditEntryRequest(
            "ActivityLogs", "Export", AuditActions.Exported, null, null, null,
            AuditModules.Security, "ActivityLogExport", null, "Exported centralized activity logs."), ct);
        return ApiResponse<IReadOnlyCollection<ActivityLogExportDto>>.Success(rows);
    }

    private static ActivityLogListQuery Normalize(ActivityLogListQuery request) => request with
    {
        Search = Trim(request.Search), Username = Trim(request.Username), Module = Trim(request.Module), Action = Trim(request.Action),
        EntityType = Trim(request.EntityType), EntityId = Trim(request.EntityId), HttpMethod = Trim(request.HttpMethod)?.ToUpperInvariant(),
        CorrelationId = Trim(request.CorrelationId), SortBy = NormalizeSortBy(request.SortBy), SortDirection = Trim(request.SortDirection)?.ToLowerInvariant()
    };

    private static ActivityLogExportRequest Normalize(ActivityLogExportRequest request) => request with
    {
        Search = Trim(request.Search), Username = Trim(request.Username), Module = Trim(request.Module), Action = Trim(request.Action),
        EntityType = Trim(request.EntityType), EntityId = Trim(request.EntityId), HttpMethod = Trim(request.HttpMethod)?.ToUpperInvariant(),
        CorrelationId = Trim(request.CorrelationId), SortBy = NormalizeSortBy(request.SortBy), SortDirection = Trim(request.SortDirection)?.ToLowerInvariant()
    };

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizeSortBy(string? value) => Trim(value) is { } requested
        ? new[] { "TimestampUtc", "Username", "Module", "Action", "EntityType", "EntityId", "HttpStatusCode" }
            .FirstOrDefault(allowed => string.Equals(allowed, requested, StringComparison.OrdinalIgnoreCase))
        : null;
}
