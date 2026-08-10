using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.DataBook;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class DataBookService : IDataBookService
{
    private readonly IDataBookRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly IPermissionService _permissions;
    private readonly IValidator<CreateDataBookEntryRequest> _createValidator;
    private readonly IValidator<UpdateDataBookEntryRequest> _updateValidator;
    private readonly IValidator<DeleteDataBookEntryRequest> _deleteValidator;
    private readonly IValidator<DataBookEntryListQuery> _listValidator;
    private readonly IValidator<DataBookExportRequest> _exportValidator;
    private readonly ILogger<DataBookService> _logger;

    public DataBookService(
        IDataBookRepository repository,
        ICurrentUser currentUser,
        IPermissionService permissions,
        IValidator<CreateDataBookEntryRequest> createValidator,
        IValidator<UpdateDataBookEntryRequest> updateValidator,
        IValidator<DeleteDataBookEntryRequest> deleteValidator,
        IValidator<DataBookEntryListQuery> listValidator,
        IValidator<DataBookExportRequest> exportValidator,
        ILogger<DataBookService> logger)
    {
        _repository = repository;
        _currentUser = currentUser;
        _permissions = permissions;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _deleteValidator = deleteValidator;
        _listValidator = listValidator;
        _exportValidator = exportValidator;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<DataBookEntryListItemDto>>> GetListAsync(DataBookEntryListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, ct);
        var userId = CurrentUserId();
        var permissions = await GetAffordancesAsync(userId, ct);
        var page = await _repository.GetListAsync(Normalize(query), userId, ct);
        var visibleItems = page.Items.Where(entry => !entry.IsPrivate || IsPrivateOwner(entry, userId)).ToArray();
        var items = visibleItems.Select(entry => entry with
        {
            CanEdit = permissions.CanEdit && (!entry.IsPrivate || IsPrivateOwner(entry, userId)),
            CanDelete = permissions.CanDelete && (!entry.IsPrivate || IsPrivateOwner(entry, userId))
        }).ToArray();

        // SQL is authoritative for this predicate. Preserve its count when it did so; never expose a count from an unexpected row.
        var totalCount = visibleItems.Length == page.Items.Count ? page.TotalCount : visibleItems.Length;
        return ApiResponse<PagedResult<DataBookEntryListItemDto>>.Success(page with { Items = items, TotalCount = totalCount });
    }

    public async Task<ApiResponse<DataBookEntryDto>> GetByIdAsync(long id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        var entry = await FindVisibleAsync(id, userId, ct);
        return ApiResponse<DataBookEntryDto>.Success(await ApplyAffordancesAsync(entry, userId, ct));
    }

    public async Task<ApiResponse<DataBookEntryDto>> CreateAsync(CreateDataBookEntryRequest request, string? correlationId, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, ct);
        var userId = CurrentUserId();
        var entry = await _repository.CreateAsync(Normalize(request), userId, NormalizeCorrelationId(correlationId), ct);
        return ApiResponse<DataBookEntryDto>.Success(await ApplyAffordancesAsync(entry, userId, ct), "Data Book entry created.");
    }

    public async Task<ApiResponse<DataBookEntryDto>> UpdateAsync(long id, UpdateDataBookEntryRequest request, string? correlationId, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, ct);
        var userId = CurrentUserId();
        var current = await FindVisibleAsync(id, userId, ct);
        EnsurePrivateOwner(current, userId);

        try
        {
            var updated = await _repository.UpdateAsync(id, Normalize(request), Convert.FromBase64String(request.RowVersion), userId, NormalizeCorrelationId(correlationId), ct);
            return ApiResponse<DataBookEntryDto>.Success(await ApplyAffordancesAsync(updated, userId, ct), "Data Book entry updated.");
        }
        catch (CosmosException exception) when (exception.StatusCode == 404)
        {
            throw EntryNotFound();
        }
        catch (CosmosException exception) when (exception.StatusCode == 409)
        {
            throw new ConflictException("The Data Book entry was changed by another user. Refresh and try again.", data: new { conflictCode = "DATA_BOOK_ENTRY_CONCURRENCY_CONFLICT" });
        }
    }

    public async Task<ApiResponse> DeleteAsync(long id, DeleteDataBookEntryRequest request, string? correlationId, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_deleteValidator, request, ct);
        var userId = CurrentUserId();
        var current = await FindVisibleAsync(id, userId, ct);
        EnsurePrivateOwner(current, userId);
        var result = await _repository.DeleteAsync(id, Convert.FromBase64String(request.RowVersion), userId, NormalizeCorrelationId(correlationId), ct);

        if (result.StatusCode == 404) throw EntryNotFound();
        if (result.StatusCode == 409)
        {
            throw new ConflictException("The Data Book entry was changed by another user. Refresh and try again.", data: new { conflictCode = "DATA_BOOK_ENTRY_CONCURRENCY_CONFLICT" });
        }
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);

        return ApiResponse.Success(result.Message);
    }

    public async Task<ApiResponse<IReadOnlyCollection<DataBookEntryHistoryDto>>> GetHistoryAsync(long id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        var entry = await FindVisibleAsync(id, userId, ct);
        EnsurePrivateOwner(entry, userId);
        var history = await _repository.GetHistoryAsync(id, userId, ct);
        return ApiResponse<IReadOnlyCollection<DataBookEntryHistoryDto>>.Success(history.Select(NormalizeHistory).ToArray());
    }

    public async Task<ApiResponse<IReadOnlyCollection<DataBookExportDto>>> ExportAsync(DataBookExportRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_exportValidator, request, ct);
        return ApiResponse<IReadOnlyCollection<DataBookExportDto>>.Success(
            await _repository.ExportAsync(Normalize(request), CurrentUserId(), ct));
    }

    private int CurrentUserId() => _currentUser.UserId ?? throw new UnauthorizedCosmosException("An authenticated user is required for Data Book operations.");

    private async Task<DataBookEntryDto> FindVisibleAsync(long id, int userId, CancellationToken ct) =>
        await _repository.GetByIdAsync(id, userId, ct) ?? throw EntryNotFound();

    private static NotFoundException EntryNotFound() => new("Data Book entry was not found.");

    private static void EnsurePrivateOwner(DataBookEntryDto entry, int userId)
    {
        // The repository and every SQL mutation scope private rows first. This second check is defence in depth.
        if (entry.IsPrivate && entry.OwnerUserId != userId) throw EntryNotFound();
    }

    private async Task<DataBookEntryDto> ApplyAffordancesAsync(DataBookEntryDto entry, int userId, CancellationToken ct)
    {
        var permissions = await GetAffordancesAsync(userId, ct);
        return entry with
        {
            CanEdit = permissions.CanEdit && (!entry.IsPrivate || entry.OwnerUserId == userId),
            CanDelete = permissions.CanDelete && (!entry.IsPrivate || entry.OwnerUserId == userId)
        };
    }

    private async Task<(bool CanEdit, bool CanDelete)> GetAffordancesAsync(int userId, CancellationToken ct) =>
        (await _permissions.UserHasPermissionAsync(userId, DataBookPermissions.Entries, PermissionAction.Edit, ct),
         await _permissions.UserHasPermissionAsync(userId, DataBookPermissions.Entries, PermissionAction.Delete, ct));

    private static bool IsPrivateOwner(DataBookEntryListItemDto entry, int userId) =>
        !entry.IsPrivate || entry.OwnerUserId == userId;

    private DataBookEntryHistoryDto NormalizeHistory(DataBookEntryHistoryRow row)
    {
        var normalization = DataBookHistoryNormalizer.Normalize(row);
        if (normalization.HasMalformedJson)
        {
            _logger.LogWarning(
                "Data Book history JSON was malformed and was safely degraded. {EntryId} {HistoryId} {ActionType} {ChangedByUserId} {CorrelationId} {ChangedFieldsMalformed} {OldDataMalformed} {NewDataMalformed}",
                row.EntryId,
                row.Id,
                row.ActionType,
                row.ChangedByUserId,
                row.CorrelationId,
                normalization.HasMalformedChangedFields,
                normalization.HasMalformedOldData,
                normalization.HasMalformedNewData);
        }

        return normalization.History;
    }

    private static CreateDataBookEntryRequest Normalize(CreateDataBookEntryRequest request) =>
        request with { Name = request.Name.Trim(), Value = request.Value.Trim(), Description = TrimToNull(request.Description), Category = TrimToNull(request.Category) };

    private static UpdateDataBookEntryRequest Normalize(UpdateDataBookEntryRequest request) =>
        request with { Name = request.Name.Trim(), Value = request.Value.Trim(), Description = TrimToNull(request.Description), Category = TrimToNull(request.Category), RowVersion = request.RowVersion.Trim() };

    private static DataBookEntryListQuery Normalize(DataBookEntryListQuery query) =>
        query with { Search = TrimToNull(query.Search), Category = TrimToNull(query.Category), Visibility = NormalizeVisibility(query.Visibility), SortBy = TrimToNull(query.SortBy), SortDirection = TrimToNull(query.SortDirection) };

    private static DataBookExportRequest Normalize(DataBookExportRequest request) =>
        request with { Search = TrimToNull(request.Search), Category = TrimToNull(request.Category), Visibility = NormalizeVisibility(request.Visibility), SortBy = TrimToNull(request.SortBy), SortDirection = TrimToNull(request.SortDirection) };

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string NormalizeVisibility(string? value) => string.IsNullOrWhiteSpace(value) ? "all" : value.Trim().ToLowerInvariant();
    private static string? NormalizeCorrelationId(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, 128)];
}
