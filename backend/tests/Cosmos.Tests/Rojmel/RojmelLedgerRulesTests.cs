using Cosmos.Application.Rojmel;
using Cosmos.Contracts.Rojmel;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Tests.Rojmel;

public sealed class RojmelLedgerRulesTests
{
    [Fact]
    public void Normal_user_can_only_access_their_own_wallet()
    {
        RojmelLedgerRules.EnsureWalletAccess(7, 7, false);
        var exception = Assert.Throws<ForbiddenCosmosException>(() => RojmelLedgerRules.EnsureWalletAccess(7, 8, false));
        Assert.Equal(403, exception.StatusCode);
    }

    [Fact]
    public void All_wallet_admin_can_access_another_users_wallet()
    {
        RojmelLedgerRules.EnsureWalletAccess(7, 8, true);
    }

    [Fact]
    public void Income_increases_and_expense_reduces_a_wallet_balance()
    {
        var afterIncome = RojmelLedgerRules.ApplyPostedMovement(100m, WalletTransactionType.Income, 50m);
        var afterExpense = RojmelLedgerRules.ApplyPostedMovement(afterIncome, WalletTransactionType.Expense, 35m);

        Assert.Equal(150m, afterIncome);
        Assert.Equal(115m, afterExpense);
    }

    [Fact]
    public void Insufficient_balance_blocks_expense_and_transfer()
    {
        var expense = Assert.Throws<CosmosException>(() => RojmelLedgerRules.ApplyPostedMovement(10m, WalletTransactionType.Expense, 11m));
        var transfer = Assert.Throws<CosmosException>(() => RojmelLedgerRules.ApplyTransfer(10m, 5m, 11m));

        Assert.Equal(409, expense.StatusCode);
        Assert.Equal(409, transfer.StatusCode);
    }

    [Fact]
    public void Transfer_creates_opposite_linked_ledger_movement_types_without_income_or_expense()
    {
        var result = RojmelLedgerRules.ApplyTransfer(100m, 25m, 40m);

        Assert.Equal(60m, result.FromBalance);
        Assert.Equal(65m, result.ToBalance);
        Assert.Equal(WalletTransactionType.TransferOut, result.SourceEntryType);
        Assert.Equal(WalletTransactionType.TransferIn, result.DestinationEntryType);

        var totals = RojmelLedgerRules.CalculateIncomeExpense([
            new WalletReportMovement(WalletTransactionType.TransferOut, 40m),
            new WalletReportMovement(WalletTransactionType.TransferIn, 40m)
        ]);
        Assert.Equal(0m, totals.Income);
        Assert.Equal(0m, totals.Expense);
    }

    [Fact]
    public void Only_one_active_company_wallet_is_allowed()
    {
        RojmelLedgerRules.EnsureSingleCompanyWallet(1);
        var exception = Assert.Throws<CosmosException>(() => RojmelLedgerRules.EnsureSingleCompanyWallet(2));
        Assert.Equal(409, exception.StatusCode);
    }

    [Fact]
    public void Income_expense_report_excludes_transfers_opening_balance_and_adjustments()
    {
        var totals = RojmelLedgerRules.CalculateIncomeExpense([
            new WalletReportMovement(WalletTransactionType.Income, 100m),
            new WalletReportMovement(WalletTransactionType.Expense, 30m),
            new WalletReportMovement(WalletTransactionType.TransferIn, 50m),
            new WalletReportMovement(WalletTransactionType.TransferOut, 50m),
            new WalletReportMovement(WalletTransactionType.OpeningBalance, 25m),
            new WalletReportMovement(WalletTransactionType.AdjustmentIn, 5m),
            new WalletReportMovement(WalletTransactionType.Expense, 99m, WalletTransactionStatus.Cancelled)
        ]);

        Assert.Equal(100m, totals.Income);
        Assert.Equal(30m, totals.Expense);
        Assert.Equal(70m, totals.NetIncomeExpense);
    }
}
