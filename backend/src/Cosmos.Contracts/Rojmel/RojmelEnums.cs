namespace Cosmos.Contracts.Rojmel;

public enum WalletType
{
    Company = 1,
    User = 2,
    External = 3,
    PettyCash = 4,
    BankCash = 5
}

public enum WalletTransactionType
{
    Income = 1,
    Expense = 2,
    TransferIn = 3,
    TransferOut = 4,
    OpeningBalance = 5,
    AdjustmentIn = 6,
    AdjustmentOut = 7
}

public enum WalletTransactionStatus
{
    Posted = 1,
    Cancelled = 2
}

public enum WalletCategoryType
{
    Income = 1,
    Expense = 2,
    Both = 3
}
