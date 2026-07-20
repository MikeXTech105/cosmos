using System.Data;
using Cosmos.Contracts.Rojmel;
using Dapper;

namespace Cosmos.Tests.Rojmel;

public sealed class RojmelDapperMaterializationTests
{
    [Fact]
    public void Wallet_transaction_contract_materializes_a_stored_procedure_row()
    {
        var row = Materialize<RojmelTransactionDto>(
            ("Id", typeof(long), 9L), ("TransactionNo", typeof(string), "WT-9"), ("WalletId", typeof(long), 3L),
            ("WalletCode", typeof(string), "USER-3"), ("WalletName", typeof(string), "User Wallet"),
            ("TransactionDate", typeof(DateTime), new DateTime(2026, 7, 20)), ("TransactionType", typeof(int), 2),
            ("Amount", typeof(decimal), 12.50m), ("BalanceBefore", typeof(decimal), 20m), ("BalanceAfter", typeof(decimal), 7.50m),
            ("Status", typeof(int), 1), ("CreatedAt", typeof(DateTime), new DateTime(2026, 7, 20, 6, 0, 0, DateTimeKind.Utc)));

        Assert.Equal(WalletTransactionType.Expense, row.TransactionType);
        Assert.Equal(WalletTransactionStatus.Posted, row.Status);
        Assert.Equal(7.50m, row.BalanceAfter);
    }

    [Fact]
    public void Wallet_contract_materializes_the_row_ownership_fields()
    {
        var row = Materialize<RojmelWalletDto>(
            ("Id", typeof(long), 3L), ("WalletCode", typeof(string), "USER-3"), ("WalletName", typeof(string), "User Wallet"),
            ("WalletType", typeof(int), 2), ("LinkedUserId", typeof(int), 7), ("OpeningBalance", typeof(decimal), 10m),
            ("CurrentBalance", typeof(decimal), 15m), ("IsCompanyWallet", typeof(bool), false), ("IsDefault", typeof(bool), true),
            ("IsActive", typeof(bool), true), ("CreatedAt", typeof(DateTime), new DateTime(2026, 7, 20, 6, 0, 0, DateTimeKind.Utc)));

        Assert.Equal(WalletType.User, row.WalletType);
        Assert.Equal(7L, row.LinkedUserId);
        Assert.True(row.IsDefault);
    }

    private static T Materialize<T>(params (string Name, Type Type, object? Value)[] columns)
    {
        using var table = new DataTable();
        foreach (var column in columns) table.Columns.Add(column.Name, column.Type);
        var data = table.NewRow();
        for (var i = 0; i < columns.Length; i++) data[i] = columns[i].Value ?? DBNull.Value;
        table.Rows.Add(data);
        using var reader = table.CreateDataReader();
        var parser = reader.GetRowParser<T>();
        Assert.True(reader.Read());
        return parser(reader);
    }
}
