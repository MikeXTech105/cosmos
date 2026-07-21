using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Parties.Queries;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Parties;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class PartyRepository : IPartyRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public PartyRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PartyDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<PartyDto>(connection, "sp_Party_GetById", new { Id = id }, cancellationToken);
    }

    public async Task<PagedResult<PartyListItemDto>> GetListAsync(GetPartiesQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "sp_Party_GetList",
            new
            {
                query.Search,
                query.PageNumber,
                query.PageSize,
                query.SortBy,
                query.SortDirection,
                query.IsActive,
                PartyType = NormalizePartyType(query.PartyType),
                query.HasGstin,
                query.HasCreditLimit
            },
            commandType: System.Data.CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        using var results = await connection.QueryMultipleAsync(command);
        var rows = (await results.ReadAsync<PartyListItemRow>()).Select(MapListItem).ToArray();
        var metadata = await results.ReadSingleAsync<PartyListMetadataDto>();
        var summary = await results.ReadSingleOrDefaultAsync<PartyListSummaryDto>();

        return new PagedResult<PartyListItemDto>(rows, query.PageNumber, query.PageSize, metadata.TotalCount, summary);
    }

    public async Task<IReadOnlyCollection<PartyExportDto>> ExportAsync(GetPartiesQuery query, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<PartyExportDto>(
            connection,
            "sp_Party_Export",
            new
            {
                query.Search,
                query.SortBy,
                query.SortDirection,
                query.IsActive,
                PartyType = NormalizePartyType(query.PartyType),
                query.HasGstin,
                query.HasCreditLimit
            },
            cancellationToken);
    }

    public async Task<PartyDto> CreateAsync(CreatePartyCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryWithStatusAsync<PartyDto>(connection, "sp_Party_Create", PartyParameters(command), cancellationToken);
    }

    public async Task<PartyDto> UpdateAsync(Guid id, UpdatePartyCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = PartyParameters(command);
        parameters.Add("Id", id);
        return await StoredProcedureExecutor.QueryWithStatusAsync<PartyDto>(connection, "sp_Party_Update", parameters, cancellationToken);
    }

    public async Task<OperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Party_Delete", new { Id = id }, cancellationToken);
    }

    public async Task<OperationResult> SetActiveAsync(Guid id, bool isActive, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, "sp_Party_SetActive", new { Id = id, IsActive = isActive }, cancellationToken);
    }

    private static DynamicParameters PartyParameters(CreatePartyCommand command)
    {
        var parameters = new DynamicParameters();
        AddPartyParameters(parameters, command);
        return parameters;
    }

    private static DynamicParameters PartyParameters(UpdatePartyCommand command)
    {
        var parameters = new DynamicParameters();
        AddPartyParameters(parameters, command);
        return parameters;
    }

    private static void AddPartyParameters(DynamicParameters parameters, dynamic command)
    {
        parameters.Add("PartyCode", command.PartyCode?.Trim());
        parameters.Add("PartyName", command.PartyName?.Trim());
        parameters.Add("MobileNo", TrimToNull(command.MobileNo));
        parameters.Add("Email", TrimToNull(command.Email));
        parameters.Add("GSTTreatment", command.GSTTreatment);
        parameters.Add("GSTIN", TrimToNull(command.GSTIN)?.ToUpperInvariant());
        parameters.Add("LegalName", TrimToNull(command.LegalName));
        parameters.Add("TradeName", TrimToNull(command.TradeName));
        parameters.Add("BillingAddressLine1", TrimToNull(command.BillingAddressLine1));
        parameters.Add("BillingAddressLine2", TrimToNull(command.BillingAddressLine2));
        parameters.Add("BillingCity", TrimToNull(command.BillingCity));
        parameters.Add("BillingState", TrimToNull(command.BillingState));
        parameters.Add("BillingCountry", TrimToNull(command.BillingCountry));
        parameters.Add("BillingPincode", TrimToNull(command.BillingPincode));
        parameters.Add("ShippingAddressLine1", TrimToNull(command.ShippingAddressLine1));
        parameters.Add("ShippingAddressLine2", TrimToNull(command.ShippingAddressLine2));
        parameters.Add("ShippingCity", TrimToNull(command.ShippingCity));
        parameters.Add("ShippingState", TrimToNull(command.ShippingState));
        parameters.Add("ShippingCountry", TrimToNull(command.ShippingCountry));
        parameters.Add("ShippingPincode", TrimToNull(command.ShippingPincode));
        parameters.Add("OpeningBalance", command.OpeningBalance);
        parameters.Add("OpeningBalanceType", command.OpeningBalanceType);
        parameters.Add("CreditLimit", command.CreditLimit);
        parameters.Add("CreditPeriodDays", command.CreditPeriodDays);
        parameters.Add("IsActive", command.IsActive);
        parameters.Add("PartyType", NormalizePartyType(command.PartyType));
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizePartyType(string? value) => string.IsNullOrWhiteSpace(value)
        ? null
        : string.Concat(value.Trim().ToLowerInvariant() switch
        {
            "customer" => "Customer",
            "supplier" => "Supplier",
            "both" => "Both",
            _ => value.Trim()
        });

    internal static PartyListItemDto MapListItem(PartyListItemRow row) => new(
        row.Id,
        row.PartyCode,
        row.PartyName,
        row.MobileNo,
        row.Email,
        row.GSTTreatment,
        row.GSTIN,
        row.OpeningBalance,
        row.OpeningBalanceType,
        row.CreditLimit,
        row.CreditPeriodDays,
        row.IsActive,
        row.CreatedOn,
        row.ModifiedOn,
        row.TotalCount)
    {
        PartyType = row.PartyType
    };

    internal sealed record PartyListItemRow(
        Guid Id,
        string PartyCode,
        string PartyName,
        string PartyType,
        string? MobileNo,
        string? Email,
        int GSTTreatment,
        string? GSTIN,
        decimal OpeningBalance,
        int OpeningBalanceType,
        decimal CreditLimit,
        int CreditPeriodDays,
        bool IsActive,
        DateTime CreatedOn,
        DateTime? ModifiedOn,
        int TotalCount);
}
