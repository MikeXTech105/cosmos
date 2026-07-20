using Cosmos.Contracts.Rojmel;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Application.Rojmel;

/// <summary>
/// Small deterministic rules shared by focused tests and mirrored by the SQL procedures.
/// SQL Server remains the transaction authority for posted wallet balances.
/// </summary>
public static class RojmelLedgerRules
{
    public static void EnsureWalletAccess(int currentUserId, int? linkedUserId, bool canAccessAllWallets)
    {
        if (!canAccessAllWallets && linkedUserId != currentUserId)
            throw new ForbiddenCosmosException("Wallet is not available to the current user.");
    }

    public static decimal ApplyPostedMovement(decimal balance, WalletTransactionType type, decimal amount)
    {
        if (amount <= 0) throw new CosmosException("Amount must be greater than zero.");
        var delta = type switch
        {
            WalletTransactionType.Income or WalletTransactionType.TransferIn or WalletTransactionType.OpeningBalance or WalletTransactionType.AdjustmentIn => amount,
            WalletTransactionType.Expense or WalletTransactionType.TransferOut or WalletTransactionType.AdjustmentOut => -amount,
            _ => throw new CosmosException("Transaction type is not supported.")
        };
        var result = balance + delta;
        if (result < 0) throw new CosmosException("Insufficient wallet balance.", 409);
        return result;
    }

    public static WalletTransferBalanceResult ApplyTransfer(decimal fromBalance, decimal toBalance, decimal amount)
    {
        if (amount <= 0) throw new CosmosException("Transfer amount must be greater than zero.");
        return new WalletTransferBalanceResult(
            ApplyPostedMovement(fromBalance, WalletTransactionType.TransferOut, amount),
            ApplyPostedMovement(toBalance, WalletTransactionType.TransferIn, amount),
            WalletTransactionType.TransferOut,
            WalletTransactionType.TransferIn);
    }

    public static void EnsureSingleCompanyWallet(int activeCompanyWalletCount) 
    {
        if (activeCompanyWalletCount > 1) throw new CosmosException("Only one active company wallet is allowed.", 409);
    }

    public static IncomeExpenseTotals CalculateIncomeExpense(IEnumerable<WalletReportMovement> movements)
    {
        var posted = movements.Where(x => x.Status == WalletTransactionStatus.Posted);
        var income = posted.Where(x => x.Type == WalletTransactionType.Income).Sum(x => x.Amount);
        var expense = posted.Where(x => x.Type == WalletTransactionType.Expense).Sum(x => x.Amount);
        return new IncomeExpenseTotals(income, expense, income - expense);
    }
}

public sealed record WalletTransferBalanceResult(decimal FromBalance, decimal ToBalance, WalletTransactionType SourceEntryType, WalletTransactionType DestinationEntryType);
public sealed record WalletReportMovement(WalletTransactionType Type, decimal Amount, WalletTransactionStatus Status = WalletTransactionStatus.Posted);
public sealed record IncomeExpenseTotals(decimal Income, decimal Expense, decimal NetIncomeExpense);
