using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class AuditRepository : IAuditRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly IAuditRequestContext _requestContext;

    public AuditRepository(ISqlConnectionFactory connectionFactory, IAuditRequestContext requestContext)
    {
        _connectionFactory = connectionFactory;
        _requestContext = requestContext;
    }

    public async Task AddAsync(AuditEntryRequest request, CancellationToken cancellationToken)
    {
        var context = _requestContext.GetCurrent();
        var payload = AuditPayloadSanitizer.Prepare(request.OldValues, request.NewValues);
        var entityType = Trim(request.EntityType) ?? Trim(request.TableName) ?? "Unknown";
        var action = NormalizeAction(request.TableName, request.ActionType);
        var entityDisplayValue = Trim(request.EntityDisplayValue) ?? AuditPayloadSanitizer.TryGetEntityDisplayValue(payload.NewValues) ?? AuditPayloadSanitizer.TryGetEntityDisplayValue(payload.OldValues);
        var actorId = request.CreatedBy ?? context.UserId;
        var actorUsername = Trim(request.ActorUsername) ?? context.Username;
        var actorDisplayName = Trim(request.ActorDisplayName) ?? context.UserDisplayName;
        var enriched = request with
        {
            TableName = Truncate(request.TableName, 128) ?? "Unknown",
            RecordId = Truncate(request.RecordId, 100) ?? "Unknown",
            ActionType = action,
            OldValues = payload.OldValues,
            NewValues = payload.NewValues,
            CreatedBy = actorId,
            Module = Truncate(Trim(request.Module) ?? AuditModules.Infer(request.TableName), 64),
            EntityType = Truncate(entityType, 128),
            EntityDisplayValue = Truncate(entityDisplayValue, 256),
            Description = Truncate(Trim(request.Description) ?? Describe(action, entityType, entityDisplayValue, request.RecordId), 500),
            ChangedFieldsJson = request.ChangedFieldsJson is null ? payload.ChangedFieldsJson : AuditPayloadSanitizer.SanitizeChangedFieldsJson(request.ChangedFieldsJson),
            RequestPath = Truncate(Trim(request.RequestPath) ?? context.RequestPath, 512),
            HttpMethod = Truncate(Trim(request.HttpMethod) ?? context.HttpMethod, 10),
            CorrelationId = Truncate(Trim(request.CorrelationId) ?? context.CorrelationId, 128),
            IpAddress = Truncate(Trim(request.IpAddress) ?? context.IpAddress, 64),
            UserAgent = Truncate(Trim(request.UserAgent) ?? context.UserAgent, 512),
            Source = Truncate(Trim(request.Source) ?? context.Source ?? "Application", 32),
            ActorUsername = Truncate(Trim(actorUsername), 100),
            ActorDisplayName = Truncate(Trim(actorDisplayName), 200)
        };

        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_AuditLog_Create", enriched, cancellationToken);
    }

    public async Task<PagedResult<ActivityLogListItemDto>> GetListAsync(ActivityLogListQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var rows = await StoredProcedureExecutor.QueryAsync<ActivityLogListItemDto>(connection, "usp_ActivityLog_GetList", query, cancellationToken);
        var totalCount = rows.FirstOrDefault()?.TotalCount ?? 0;
        return new PagedResult<ActivityLogListItemDto>(rows, query.PageNumber, query.PageSize, totalCount);
    }

    public async Task<ActivityLogDetailRow?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<ActivityLogDetailRow>(connection, "usp_ActivityLog_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<IReadOnlyCollection<ActivityLogExportDto>> ExportAsync(ActivityLogExportRequest request, int maxRows, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<ActivityLogExportDto>(connection, "usp_ActivityLog_Export", new { request.Search, request.UserId, request.Username, request.Module, request.Action, request.EntityType, request.EntityId, request.FromDate, request.ToDate, request.HttpMethod, request.StatusCode, request.CorrelationId, request.SortBy, request.SortDirection, MaxRows = maxRows }, cancellationToken);
    }

    private static string NormalizeAction(string? tableName, string? action)
    {
        if (string.Equals(tableName, "RolePermissions", StringComparison.OrdinalIgnoreCase)) return AuditActions.PermissionChanged;
        if (string.Equals(tableName, "WalletTransfers", StringComparison.OrdinalIgnoreCase) && string.Equals(action, "Create", StringComparison.OrdinalIgnoreCase)) return AuditActions.Transferred;
        return AuditActions.Normalize(action);
    }

    private static string Describe(string action, string entityType, string? entityDisplayValue, string? recordId) =>
        string.IsNullOrWhiteSpace(entityDisplayValue)
            ? $"{action} {entityType} {recordId}".Trim()
            : $"{action} {entityType} {entityDisplayValue}";

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? Truncate(string? value, int maxLength) => value is null ? null : value.Length <= maxLength ? value : value[..maxLength];
}
