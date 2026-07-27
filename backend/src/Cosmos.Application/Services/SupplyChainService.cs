using System.Text.Json;
using System.Text;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.ProcurementPlanning;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.SupplyChain;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Cosmos.Application.Services;

public sealed class SupplyChainService : ISupplyChainService
{
    private readonly ISupplyChainRepository _repository;
    private readonly IProcurementPlanningRepository _procurementRepository;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<SupplyChainService> _logger;
    private readonly IValidator<SupplyChainListQuery> _channelListValidator;
    private readonly IValidator<SaveChannelRequest> _channelValidator;
    private readonly IValidator<ChannelWarehouseQuery> _warehouseListValidator;
    private readonly IValidator<SaveChannelWarehouseRequest> _warehouseValidator;
    private readonly IValidator<ChannelItemMappingQuery> _mappingListValidator;
    private readonly IValidator<SaveChannelItemMappingRequest> _mappingValidator;
    private readonly IValidator<ItemPackagingProfileQuery> _packagingListValidator;
    private readonly IValidator<SaveItemPackagingProfileRequest> _packagingValidator;
    private readonly IValidator<SupplyChainImportBatchQuery> _importListValidator;
    private readonly IValidator<CommitSupplyChainImportRequest> _importCommitValidator;
    private readonly IValidator<CancelSupplyChainImportRequest> _importCancelValidator;

    public SupplyChainService(
        ISupplyChainRepository repository,
        IProcurementPlanningRepository procurementRepository,
        IAuditRepository audit,
        ICurrentUser currentUser,
        ILogger<SupplyChainService> logger,
        IValidator<SupplyChainListQuery> channelListValidator,
        IValidator<SaveChannelRequest> channelValidator,
        IValidator<ChannelWarehouseQuery> warehouseListValidator,
        IValidator<SaveChannelWarehouseRequest> warehouseValidator,
        IValidator<ChannelItemMappingQuery> mappingListValidator,
        IValidator<SaveChannelItemMappingRequest> mappingValidator,
        IValidator<ItemPackagingProfileQuery> packagingListValidator,
        IValidator<SaveItemPackagingProfileRequest> packagingValidator,
        IValidator<SupplyChainImportBatchQuery> importListValidator,
        IValidator<CommitSupplyChainImportRequest> importCommitValidator,
        IValidator<CancelSupplyChainImportRequest> importCancelValidator)
    {
        _repository = repository;
        _procurementRepository = procurementRepository;
        _audit = audit;
        _currentUser = currentUser;
        _logger = logger;
        _channelListValidator = channelListValidator;
        _channelValidator = channelValidator;
        _warehouseListValidator = warehouseListValidator;
        _warehouseValidator = warehouseValidator;
        _mappingListValidator = mappingListValidator;
        _mappingValidator = mappingValidator;
        _packagingListValidator = packagingListValidator;
        _packagingValidator = packagingValidator;
        _importListValidator = importListValidator;
        _importCommitValidator = importCommitValidator;
        _importCancelValidator = importCancelValidator;
    }

    private long? UserId => _currentUser.UserId;
    private int? AuditUserId => UserId is null ? null : checked((int)UserId.Value);

    public async Task<ApiResponse<PagedResult<ChannelDto>>> GetChannelsAsync(SupplyChainListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_channelListValidator, query, ct);
        return ApiResponse<PagedResult<ChannelDto>>.Success(await _repository.GetChannelsAsync(query, ct));
    }

    public async Task<ApiResponse<ChannelDto>> GetChannelAsync(long id, CancellationToken ct) =>
        ApiResponse<ChannelDto>.Success(Found(await _repository.GetChannelAsync(id, ct), "Channel"));

    public Task<ApiResponse<ChannelDto>> CreateChannelAsync(SaveChannelRequest request, CancellationToken ct) => SaveChannelAsync(null, request, ct);
    public Task<ApiResponse<ChannelDto>> UpdateChannelAsync(long id, SaveChannelRequest request, CancellationToken ct) => SaveChannelAsync(id, request, ct);

    private async Task<ApiResponse<ChannelDto>> SaveChannelAsync(long? id, SaveChannelRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_channelValidator, request, ct);
        var before = id.HasValue ? Found(await _repository.GetChannelAsync(id.Value, ct), "Channel") : null;
        var saved = await _repository.SaveChannelAsync(id, request with
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Description = TrimToNull(request.Description)
        }, UserId, ct);
        await AuditAsync("SalesChannels", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<ChannelDto>.Success(saved, id.HasValue ? "Channel updated." : "Channel created.");
    }

    public async Task<ApiResponse> SetChannelStatusAsync(long id, ChangeSupplyChainActiveStatusRequest request, CancellationToken ct)
    {
        var before = Found(await _repository.GetChannelAsync(id, ct), "Channel");
        await _repository.SetChannelStatusAsync(id, request.IsActive, UserId, ct);
        var after = Found(await _repository.GetChannelAsync(id, ct), "Channel");
        await AuditAsync("SalesChannels", id, request.IsActive ? "Activate" : "Deactivate", before, after, ct);
        return ApiResponse.Success(request.IsActive ? "Channel activated." : "Channel deactivated.");
    }

    public async Task<ApiResponse> DeleteChannelAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetChannelAsync(id, ct), "Channel");
        await _repository.DeleteChannelAsync(id, UserId, ct);
        await AuditAsync("SalesChannels", id, "Delete", before, null, ct);
        return ApiResponse.Success("Channel deleted.");
    }

    public async Task<ApiResponse<PagedResult<ChannelWarehouseDto>>> GetWarehousesAsync(ChannelWarehouseQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_warehouseListValidator, query, ct);
        return ApiResponse<PagedResult<ChannelWarehouseDto>>.Success(await _repository.GetWarehousesAsync(query, ct));
    }

    public async Task<ApiResponse<ChannelWarehouseDto>> GetWarehouseAsync(long id, CancellationToken ct) =>
        ApiResponse<ChannelWarehouseDto>.Success(Found(await _repository.GetWarehouseAsync(id, ct), "Channel warehouse"));

    public Task<ApiResponse<ChannelWarehouseDto>> CreateWarehouseAsync(SaveChannelWarehouseRequest request, CancellationToken ct) => SaveWarehouseAsync(null, request, ct);
    public Task<ApiResponse<ChannelWarehouseDto>> UpdateWarehouseAsync(long id, SaveChannelWarehouseRequest request, CancellationToken ct) => SaveWarehouseAsync(id, request, ct);

    private async Task<ApiResponse<ChannelWarehouseDto>> SaveWarehouseAsync(long? id, SaveChannelWarehouseRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_warehouseValidator, request, ct);
        var before = id.HasValue ? Found(await _repository.GetWarehouseAsync(id.Value, ct), "Channel warehouse") : null;
        var saved = await _repository.SaveWarehouseAsync(id, request with
        {
            WarehouseCode = request.WarehouseCode.Trim().ToUpperInvariant(),
            WarehouseName = request.WarehouseName.Trim(),
            City = TrimToNull(request.City), State = TrimToNull(request.State), AddressLine1 = TrimToNull(request.AddressLine1),
            AddressLine2 = TrimToNull(request.AddressLine2), PostalCode = TrimToNull(request.PostalCode), Region = TrimToNull(request.Region)
        }, UserId, ct);
        await AuditAsync("ChannelWarehouses", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<ChannelWarehouseDto>.Success(saved, id.HasValue ? "Channel warehouse updated." : "Channel warehouse created.");
    }

    public async Task<ApiResponse> SetWarehouseStatusAsync(long id, ChangeSupplyChainActiveStatusRequest request, CancellationToken ct)
    {
        var before = Found(await _repository.GetWarehouseAsync(id, ct), "Channel warehouse");
        await _repository.SetWarehouseStatusAsync(id, request.IsActive, UserId, ct);
        var after = Found(await _repository.GetWarehouseAsync(id, ct), "Channel warehouse");
        await AuditAsync("ChannelWarehouses", id, request.IsActive ? "Activate" : "Deactivate", before, after, ct);
        return ApiResponse.Success(request.IsActive ? "Channel warehouse activated." : "Channel warehouse deactivated.");
    }

    public async Task<ApiResponse> DeleteWarehouseAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetWarehouseAsync(id, ct), "Channel warehouse");
        await _repository.DeleteWarehouseAsync(id, UserId, ct);
        await AuditAsync("ChannelWarehouses", id, "Delete", before, null, ct);
        return ApiResponse.Success("Channel warehouse deleted.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<ChannelWarehouseDropdownDto>>> GetWarehouseDropdownAsync(long? channelId, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<ChannelWarehouseDropdownDto>>.Success(await _repository.GetWarehouseDropdownAsync(channelId, ct));

    public async Task<ApiResponse<PagedResult<ChannelItemMappingDto>>> GetItemMappingsAsync(ChannelItemMappingQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_mappingListValidator, query, ct);
        return ApiResponse<PagedResult<ChannelItemMappingDto>>.Success(await _repository.GetItemMappingsAsync(query, ct));
    }

    public async Task<ApiResponse<ChannelItemMappingDto>> GetItemMappingAsync(long id, CancellationToken ct) =>
        ApiResponse<ChannelItemMappingDto>.Success(Found(await _repository.GetItemMappingAsync(id, ct), "Channel Item mapping"));

    public Task<ApiResponse<ChannelItemMappingDto>> CreateItemMappingAsync(SaveChannelItemMappingRequest request, CancellationToken ct) => SaveItemMappingAsync(null, request, ct);
    public Task<ApiResponse<ChannelItemMappingDto>> UpdateItemMappingAsync(long id, SaveChannelItemMappingRequest request, CancellationToken ct) => SaveItemMappingAsync(id, request, ct);

    private async Task<ApiResponse<ChannelItemMappingDto>> SaveItemMappingAsync(long? id, SaveChannelItemMappingRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_mappingValidator, request, ct);
        var before = id.HasValue ? Found(await _repository.GetItemMappingAsync(id.Value, ct), "Channel Item mapping") : null;
        var saved = await _repository.SaveItemMappingAsync(id, request with
        {
            ChannelSku = request.ChannelSku.Trim(), ChannelProductName = TrimToNull(request.ChannelProductName), ExternalItemId = TrimToNull(request.ExternalItemId)
        }, UserId, ct);
        await AuditAsync("ChannelSkuMappings", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<ChannelItemMappingDto>.Success(saved, id.HasValue ? "Channel Item mapping updated." : "Channel Item mapping created.");
    }

    public async Task<ApiResponse> SetItemMappingStatusAsync(long id, ChangeSupplyChainActiveStatusRequest request, CancellationToken ct)
    {
        var before = Found(await _repository.GetItemMappingAsync(id, ct), "Channel Item mapping");
        await _repository.SetItemMappingStatusAsync(id, request.IsActive, UserId, ct);
        var after = Found(await _repository.GetItemMappingAsync(id, ct), "Channel Item mapping");
        await AuditAsync("ChannelSkuMappings", id, request.IsActive ? "Activate" : "Deactivate", before, after, ct);
        return ApiResponse.Success(request.IsActive ? "Channel Item mapping activated." : "Channel Item mapping deactivated.");
    }

    public async Task<ApiResponse> DeleteItemMappingAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetItemMappingAsync(id, ct), "Channel Item mapping");
        await _repository.DeleteItemMappingAsync(id, UserId, ct);
        await AuditAsync("ChannelSkuMappings", id, "Delete", before, null, ct);
        return ApiResponse.Success("Channel Item mapping deleted.");
    }

    public async Task<ApiResponse<IReadOnlyCollection<UnmatchedChannelItemDto>>> GetUnmatchedItemsAsync(CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<UnmatchedChannelItemDto>>.Success(await _repository.GetUnmatchedItemsAsync(ct));

    public async Task<ApiResponse<PagedResult<ItemPackagingProfileDto>>> GetPackagingProfilesAsync(ItemPackagingProfileQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_packagingListValidator, query, ct);
        return ApiResponse<PagedResult<ItemPackagingProfileDto>>.Success(await _repository.GetPackagingProfilesAsync(query, ct));
    }

    public async Task<ApiResponse<ItemPackagingProfileDto>> GetPackagingProfileAsync(long id, CancellationToken ct) =>
        ApiResponse<ItemPackagingProfileDto>.Success(Found(await _repository.GetPackagingProfileAsync(id, ct), "Item packaging profile"));

    public Task<ApiResponse<ItemPackagingProfileDto>> CreatePackagingProfileAsync(SaveItemPackagingProfileRequest request, CancellationToken ct) => SavePackagingProfileAsync(null, request, ct);
    public Task<ApiResponse<ItemPackagingProfileDto>> UpdatePackagingProfileAsync(long id, SaveItemPackagingProfileRequest request, CancellationToken ct) => SavePackagingProfileAsync(id, request, ct);

    private async Task<ApiResponse<ItemPackagingProfileDto>> SavePackagingProfileAsync(long? id, SaveItemPackagingProfileRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_packagingValidator, request, ct);
        var before = id.HasValue ? Found(await _repository.GetPackagingProfileAsync(id.Value, ct), "Item packaging profile") : null;
        var saved = await _repository.SavePackagingProfileAsync(id, request with
        {
            PackagingCode = request.PackagingCode.Trim().ToUpperInvariant(), PackagingName = TrimToNull(request.PackagingName),
            DimensionUnit = request.DimensionUnit.Trim().ToUpperInvariant(), WeightUnit = request.WeightUnit.Trim().ToUpperInvariant()
        }, UserId, ct);
        await AuditAsync("ItemPackagingProfiles", saved.Id, id.HasValue ? "Update" : "Create", before, saved, ct);
        return ApiResponse<ItemPackagingProfileDto>.Success(saved, id.HasValue ? "Item packaging profile updated." : "Item packaging profile created.");
    }

    public async Task<ApiResponse<ItemPackagingProfileDto>> SetPackagingProfileDefaultAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetPackagingProfileAsync(id, ct), "Item packaging profile");
        var saved = await _repository.SetPackagingProfileDefaultAsync(id, UserId, ct);
        await AuditAsync("ItemPackagingProfiles", id, "SetDefault", before, saved, ct);
        return ApiResponse<ItemPackagingProfileDto>.Success(saved, "Default packaging profile set.");
    }

    public async Task<ApiResponse> DeletePackagingProfileAsync(long id, CancellationToken ct)
    {
        var before = Found(await _repository.GetPackagingProfileAsync(id, ct), "Item packaging profile");
        await _repository.DeletePackagingProfileAsync(id, UserId, ct);
        await AuditAsync("ItemPackagingProfiles", id, "Delete", before, null, ct);
        return ApiResponse.Success("Item packaging profile deleted.");
    }

    public async Task<ApiResponse<SupplyChainImportValidationDto>> ValidateImportAsync(string fileName, string importType, long? channelId, byte[] content, string? correlationId, CancellationToken ct)
    {
        if (!string.Equals(importType, "ProcurementSales", StringComparison.OrdinalIgnoreCase))
            throw new CosmosException("Only ProcurementSales is operationally enabled in this release. The shared batch contract reserves the remaining import types for their future modules.", 400);

        IReadOnlyCollection<ParsedSalesImportRow> parsed;
        try { parsed = ProcurementSalesImportParser.Parse(fileName, content); }
        catch (Exception ex) when (ex is InvalidDataException or DecoderFallbackException)
        { throw new CosmosException(ex.Message, 400); }

        var lookup = await _procurementRepository.GetImportLookupAsync(ct);
        var activeChannels = lookup.GroupBy(x => x.ChannelCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.First().SalesChannelId, StringComparer.OrdinalIgnoreCase);
        var mappings = lookup.Where(x => x.ChannelSku is not null)
            .ToDictionary(x => $"{x.SalesChannelId}|{x.ChannelSku}", StringComparer.OrdinalIgnoreCase);
        var duplicates = parsed.GroupBy(x => $"{x.SalesDate:yyyy-MM-dd}|{x.ChannelCode}|{x.ChannelSku}|{x.Quantity}", StringComparer.OrdinalIgnoreCase)
            .Where(x => x.Count() > 1).SelectMany(x => x.Skip(1)).Select(x => x.RowNumber).ToHashSet();
        var stagedRows = new List<SupplyChainImportStagedRow>(parsed.Count);

        foreach (var row in parsed)
        {
            var errors = row.Errors.Select(error => new SupplyChainImportRowErrorDto(row.RowNumber, FieldFor(error), error)).ToList();
            long? resolvedChannelId = null;
            ImportLookupRow? mapping = null;
            if (!string.IsNullOrWhiteSpace(row.ChannelCode))
            {
                if (!activeChannels.TryGetValue(row.ChannelCode, out var channel))
                    errors.Add(new SupplyChainImportRowErrorDto(row.RowNumber, "ChannelCode", $"Unknown or inactive channel '{row.ChannelCode}'.", row.ChannelCode));
                else
                {
                    resolvedChannelId = channel;
                    if (channelId.HasValue && channelId.Value != channel)
                        errors.Add(new SupplyChainImportRowErrorDto(row.RowNumber, "ChannelCode", "The row channel does not match the selected channel.", row.ChannelCode));
                    if (!string.IsNullOrWhiteSpace(row.ChannelSku)) mappings.TryGetValue($"{channel}|{row.ChannelSku}", out mapping);
                }
            }
            if (duplicates.Contains(row.RowNumber)) errors.Add(new SupplyChainImportRowErrorDto(row.RowNumber, "Row", "Duplicate logical sales row in this file."));
            stagedRows.Add(new SupplyChainImportStagedRow(
                row.RowNumber, row.SalesDate, row.ChannelCode?.ToUpperInvariant(), resolvedChannelId, row.ChannelSku, row.ChannelProductName,
                mapping?.ItemId, row.Quantity, duplicates.Contains(row.RowNumber), errors,
                JsonSerializer.Serialize(new { row.RowNumber, row.SalesDate, row.ChannelCode, row.ChannelSku, row.ChannelProductName, row.Quantity })));
        }

        var correlation = string.IsNullOrWhiteSpace(correlationId)
            ? Guid.NewGuid().ToString("N")
            : correlationId;
        var result = await _repository.SaveImportValidationAsync(fileName, ProcurementSalesImportParser.ComputeHash(content), "ProcurementSales", channelId,
            stagedRows.Where(x => x.SalesDate.HasValue).Select(x => x.SalesDate!.Value).DefaultIfEmpty().Min(),
            stagedRows.Where(x => x.SalesDate.HasValue).Select(x => x.SalesDate!.Value).DefaultIfEmpty().Max(), stagedRows, correlation, UserId, ct);
        await AuditAsync("SupplyChainImportBatches", result.BatchId, "ImportValidate", null, new { result, CorrelationId = correlation }, ct);
        _logger.LogInformation("Validated supply-chain import batch {BatchId}; valid {ValidRows}, invalid {InvalidRows}; correlation {CorrelationId}.", result.BatchId, result.ValidRows, result.InvalidRows, correlation);
        return ApiResponse<SupplyChainImportValidationDto>.Success(result, "Import validated. Commit only after correcting any reported errors.");
    }

    public async Task<ApiResponse<PagedResult<SupplyChainImportBatchDto>>> GetImportBatchesAsync(SupplyChainImportBatchQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_importListValidator, query, ct);
        return ApiResponse<PagedResult<SupplyChainImportBatchDto>>.Success(await _repository.GetImportBatchesAsync(query, ct));
    }

    public async Task<ApiResponse<SupplyChainImportBatchDetailsDto>> GetImportBatchAsync(long id, CancellationToken ct)
    {
        var batch = Found(await _repository.GetImportBatchAsync(id, ct), "Supply-chain import batch");
        return ApiResponse<SupplyChainImportBatchDetailsDto>.Success(new SupplyChainImportBatchDetailsDto(batch, await _repository.GetImportErrorsAsync(id, ct)));
    }

    public async Task<ApiResponse<IReadOnlyCollection<SupplyChainImportRowErrorDto>>> GetImportErrorsAsync(long id, CancellationToken ct)
    {
        Found(await _repository.GetImportBatchAsync(id, ct), "Supply-chain import batch");
        return ApiResponse<IReadOnlyCollection<SupplyChainImportRowErrorDto>>.Success(await _repository.GetImportErrorsAsync(id, ct));
    }

    public async Task<ApiResponse<SupplyChainImportBatchDto>> CommitImportAsync(long id, CommitSupplyChainImportRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_importCommitValidator, request, ct);
        var before = Found(await _repository.GetImportBatchAsync(id, ct), "Supply-chain import batch");
        var saved = await _repository.CommitImportAsync(id, request.AllowDuplicate, TrimToNull(request.CorrectionReason), UserId, ct);
        await AuditAsync("SupplyChainImportBatches", id, "ImportCommit", before, saved, ct);
        return ApiResponse<SupplyChainImportBatchDto>.Success(saved, "Import committed transactionally.");
    }

    public async Task<ApiResponse> CancelImportAsync(long id, CancelSupplyChainImportRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_importCancelValidator, request, ct);
        var before = Found(await _repository.GetImportBatchAsync(id, ct), "Supply-chain import batch");
        await _repository.CancelImportAsync(id, request.Reason.Trim(), UserId, ct);
        await AuditAsync("SupplyChainImportBatches", id, "ImportCancel", before, new { request.Reason }, ct);
        return ApiResponse.Success("Supply-chain import batch cancelled.");
    }

    private static T Found<T>(T? value, string name) where T : class => value ?? throw new NotFoundException($"{name} was not found.");
    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string FieldFor(string error) => error.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.TrimEnd('.') ?? "Row";
    private Task AuditAsync(string table, long id, string action, object? before, object? after, CancellationToken ct) =>
        _audit.AddAsync(new AuditEntryRequest(table, id.ToString(), action, before is null ? null : AuditSerializer.Serialize(before), after is null ? null : AuditSerializer.Serialize(after), AuditUserId), ct);
}
