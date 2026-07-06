using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Parties.Commands;
using Cosmos.Contracts.Parties;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class PartySettingsRepository : IPartySettingsRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public PartySettingsRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PartySettingsDto> GetAsync(CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<PartySettingsDto>(connection, "sp_PartySettings_Get", null, cancellationToken)
            ?? throw new InvalidOperationException("Party settings were not found.");
    }

    public async Task<PartySettingsDto> UpdateAsync(UpdatePartySettingsCommand command, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var parameters = new DynamicParameters();
        parameters.Add("EnablePartyGrouping", command.EnablePartyGrouping);
        parameters.Add("EnableShippingAddress", command.EnableShippingAddress);
        parameters.Add("PrintShippingAddress", command.PrintShippingAddress);
        parameters.Add("EnablePartyStatus", command.EnablePartyStatus);
        parameters.Add("EnablePaymentReminder", command.EnablePaymentReminder);
        parameters.Add("ReminderDays", command.ReminderDays);
        parameters.Add("ReminderMessage", TrimToNull(command.ReminderMessage));
        parameters.Add("EnableLoyaltyPoints", command.EnableLoyaltyPoints);
        parameters.Add("AdditionalField1Name", TrimToNull(command.AdditionalField1Name));
        parameters.Add("AdditionalField1Enabled", command.AdditionalField1Enabled);
        parameters.Add("AdditionalField1ShowInPrint", command.AdditionalField1ShowInPrint);
        parameters.Add("AdditionalField2Name", TrimToNull(command.AdditionalField2Name));
        parameters.Add("AdditionalField2Enabled", command.AdditionalField2Enabled);
        parameters.Add("AdditionalField2ShowInPrint", command.AdditionalField2ShowInPrint);
        parameters.Add("AdditionalField3Name", TrimToNull(command.AdditionalField3Name));
        parameters.Add("AdditionalField3Enabled", command.AdditionalField3Enabled);
        parameters.Add("AdditionalField3ShowInPrint", command.AdditionalField3ShowInPrint);
        parameters.Add("AdditionalField4Name", TrimToNull(command.AdditionalField4Name));
        parameters.Add("AdditionalField4Enabled", command.AdditionalField4Enabled);
        parameters.Add("AdditionalField4ShowInPrint", command.AdditionalField4ShowInPrint);
        parameters.Add("AdditionalField4Type", command.AdditionalField4Type);

        return await StoredProcedureExecutor.QueryWithStatusAsync<PartySettingsDto>(connection, "sp_PartySettings_Update", parameters, cancellationToken);
    }

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
