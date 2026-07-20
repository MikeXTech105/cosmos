using Cosmos.Contracts.Common;

namespace Cosmos.Contracts.Rojmel;

public sealed class RojmelWalletDto
{
    public long Id { get; init; }
    public string WalletCode { get; init; } = string.Empty;
    public string WalletName { get; init; } = string.Empty;
    public WalletType WalletType { get; init; }
    public long? LinkedUserId { get; init; }
    public string? LinkedUserName { get; init; }
    public decimal OpeningBalance { get; init; }
    public decimal CurrentBalance { get; init; }
    public bool IsCompanyWallet { get; init; }
    public bool IsDefault { get; init; }
    public bool IsActive { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public long? CreatedBy { get; init; }
    public DateTime? ModifiedAt { get; init; }
    public long? ModifiedBy { get; init; }
    public int TotalCount { get; init; }
}

public sealed record RojmelWalletListQuery(
    string? Search = null,
    WalletType? WalletType = null,
    long? LinkedUserId = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record CreateRojmelWalletRequest(
    string WalletCode,
    string WalletName,
    WalletType WalletType,
    long? LinkedUserId,
    decimal OpeningBalance,
    bool IsDefault = false,
    bool IsActive = true,
    string? Notes = null);

public sealed record UpdateRojmelWalletRequest(
    string WalletName,
    WalletType WalletType,
    long? LinkedUserId,
    bool IsDefault,
    string? Notes);

public sealed record ChangeRojmelWalletStatusRequest(bool IsActive);

public sealed record WalletBalanceDto(long WalletId, string WalletCode, string WalletName, decimal CurrentBalance, DateTime AsOfUtc);

public sealed class RojmelCategoryDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public WalletCategoryType CategoryType { get; init; }
    public bool IsSystemCategory { get; init; }
    public bool IsActive { get; init; }
}

public sealed class RojmelTransactionDto
{
    public long Id { get; init; }
    public string TransactionNo { get; init; } = string.Empty;
    public long WalletId { get; init; }
    public string WalletCode { get; init; } = string.Empty;
    public string WalletName { get; init; } = string.Empty;
    public DateOnly TransactionDate { get; init; }
    public WalletTransactionType TransactionType { get; init; }
    public long? CategoryId { get; init; }
    public string? CategoryName { get; init; }
    public decimal Amount { get; init; }
    public decimal BalanceBefore { get; init; }
    public decimal BalanceAfter { get; init; }
    public string? PaymentMode { get; init; }
    public string? Description { get; init; }
    public string? ReferenceNo { get; init; }
    public long? RelatedTransferId { get; init; }
    public WalletTransactionStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
    public long? CreatedBy { get; init; }
    public DateTime? CancelledAt { get; init; }
    public long? CancelledBy { get; init; }
    public string? CancelReason { get; init; }
    public int TotalCount { get; init; }
}

public sealed record RojmelTransactionListQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    long? WalletId = null,
    long? LinkedUserId = null,
    long? CategoryId = null,
    WalletTransactionType? TransactionType = null,
    WalletTransactionStatus? Status = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record CreateRojmelTransactionRequest(
    long WalletId,
    DateOnly TransactionDate,
    long? CategoryId,
    decimal Amount,
    string? PaymentMode,
    string? Description,
    string? ReferenceNo);

public sealed record CreateMyWalletTransactionRequest(
    DateOnly TransactionDate,
    long? CategoryId,
    decimal Amount,
    string? PaymentMode,
    string? Description,
    string? ReferenceNo);

public sealed record CreateRojmelAdjustmentRequest(
    long WalletId,
    DateOnly TransactionDate,
    bool IsIncrease,
    decimal Amount,
    string? Description,
    string? ReferenceNo);

public sealed record CancelRojmelTransactionRequest(string Reason);

public sealed class RojmelTransferDto
{
    public long Id { get; init; }
    public string TransferNo { get; init; } = string.Empty;
    public DateOnly TransferDate { get; init; }
    public long FromWalletId { get; init; }
    public string FromWalletName { get; init; } = string.Empty;
    public long ToWalletId { get; init; }
    public string ToWalletName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string? Description { get; init; }
    public string? ReferenceNo { get; init; }
    public WalletTransactionStatus Status { get; init; }
    public long TransferOutTransactionId { get; init; }
    public long TransferInTransactionId { get; init; }
    public DateTime CreatedAt { get; init; }
    public long? CreatedBy { get; init; }
    public DateTime? CancelledAt { get; init; }
    public long? CancelledBy { get; init; }
    public string? CancelReason { get; init; }
    public int TotalCount { get; init; }
}

public sealed record RojmelTransferListQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    long? WalletId = null,
    WalletTransactionStatus? Status = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 20);

public sealed record CreateRojmelTransferRequest(
    DateOnly TransferDate,
    long FromWalletId,
    long ToWalletId,
    decimal Amount,
    string? Description,
    string? ReferenceNo);

public sealed record CancelRojmelTransferRequest(string Reason);

public sealed class RojmelDashboardSummaryDto
{
    public decimal CompanyWalletBalance { get; init; }
    public decimal TotalWalletBalance { get; init; }
    public decimal TotalIncome { get; init; }
    public decimal TotalExpense { get; init; }
    public decimal TotalTransfers { get; init; }
    public int ActiveWalletCount { get; init; }
    public bool IsAllWalletView { get; init; }
    public DateOnly FromDate { get; init; }
    public DateOnly ToDate { get; init; }
    public DateTime GeneratedAtUtc { get; init; }
}

public sealed class RojmelWalletBalanceRowDto
{
    public long WalletId { get; init; }
    public string WalletCode { get; init; } = string.Empty;
    public string WalletName { get; init; } = string.Empty;
    public WalletType WalletType { get; init; }
    public string? LinkedUserName { get; init; }
    public decimal CurrentBalance { get; init; }
}

public sealed class RojmelIncomeExpenseReportDto
{
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public decimal NetIncomeExpense { get; init; }
    public decimal TransfersExcluded { get; init; }
    public decimal AdjustmentsExcluded { get; init; }
    public decimal OpeningBalancesExcluded { get; init; }
}

public sealed class RojmelCategoryExpenseReportDto
{
    public long? CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public decimal ExpenseAmount { get; init; }
    public int TransactionCount { get; init; }
}

public sealed class RojmelDailyCashFlowDto
{
    public DateOnly TransactionDate { get; init; }
    public decimal Income { get; init; }
    public decimal Expense { get; init; }
    public decimal NetIncomeExpense { get; init; }
}

public sealed class RojmelUserWalletBalanceDto
{
    public long WalletId { get; init; }
    public long? LinkedUserId { get; init; }
    public string WalletName { get; init; } = string.Empty;
    public string? LinkedUserName { get; init; }
    public decimal CurrentBalance { get; init; }
}

public sealed record RojmelReportQuery(
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    long? WalletId = null,
    long? LinkedUserId = null,
    long? CategoryId = null,
    WalletTransactionType? TransactionType = null,
    WalletTransactionStatus? Status = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 200,
    string? SortBy = null,
    string? SortDirection = null);

public sealed record RojmelDashboardQuery(DateOnly? FromDate = null, DateOnly? ToDate = null, int RecentTransactionCount = 10);
