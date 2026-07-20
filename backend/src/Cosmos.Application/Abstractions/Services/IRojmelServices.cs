using Cosmos.Contracts.Common;
using Cosmos.Contracts.Rojmel;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IRojmelWalletService
{
    Task<ApiResponse<PagedResult<RojmelWalletDto>>> GetWalletsAsync(RojmelWalletListQuery query, CancellationToken ct);
    Task<ApiResponse<RojmelWalletDto>> GetWalletAsync(long id, CancellationToken ct);
    Task<ApiResponse<RojmelWalletDto>> CreateWalletAsync(CreateRojmelWalletRequest request, CancellationToken ct);
    Task<ApiResponse<RojmelWalletDto>> UpdateWalletAsync(long id, UpdateRojmelWalletRequest request, CancellationToken ct);
    Task<ApiResponse> SetWalletStatusAsync(long id, ChangeRojmelWalletStatusRequest request, CancellationToken ct);
    Task<ApiResponse<WalletBalanceDto>> GetBalanceAsync(long id, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<RojmelCategoryDto>>> GetCategoriesAsync(WalletCategoryType? categoryType, CancellationToken ct);
    Task<ApiResponse<RojmelWalletDto>> GetMyWalletAsync(CancellationToken ct);
}

public interface IRojmelTransactionService
{
    Task<ApiResponse<PagedResult<RojmelTransactionDto>>> GetTransactionsAsync(RojmelTransactionListQuery query, CancellationToken ct);
    Task<ApiResponse<RojmelTransactionDto>> GetTransactionAsync(long id, CancellationToken ct);
    Task<ApiResponse<RojmelTransactionDto>> CreateIncomeAsync(CreateRojmelTransactionRequest request, CancellationToken ct);
    Task<ApiResponse<RojmelTransactionDto>> CreateExpenseAsync(CreateRojmelTransactionRequest request, CancellationToken ct);
    Task<ApiResponse<RojmelTransactionDto>> CreateMyIncomeAsync(CreateMyWalletTransactionRequest request, CancellationToken ct);
    Task<ApiResponse<RojmelTransactionDto>> CreateMyExpenseAsync(CreateMyWalletTransactionRequest request, CancellationToken ct);
    Task<ApiResponse<RojmelTransactionDto>> CreateAdjustmentAsync(CreateRojmelAdjustmentRequest request, CancellationToken ct);
    Task<ApiResponse> CancelAsync(long id, CancelRojmelTransactionRequest request, CancellationToken ct);
}

public interface IRojmelTransferService
{
    Task<ApiResponse<PagedResult<RojmelTransferDto>>> GetTransfersAsync(RojmelTransferListQuery query, CancellationToken ct);
    Task<ApiResponse<RojmelTransferDto>> GetTransferAsync(long id, CancellationToken ct);
    Task<ApiResponse<RojmelTransferDto>> CreateAsync(CreateRojmelTransferRequest request, CancellationToken ct);
    Task<ApiResponse> CancelAsync(long id, CancelRojmelTransferRequest request, CancellationToken ct);
}

public interface IRojmelDashboardService
{
    Task<ApiResponse<RojmelDashboardSummaryDto>> GetSummaryAsync(RojmelDashboardQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<RojmelWalletBalanceRowDto>>> GetWalletBalancesAsync(CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<RojmelTransactionDto>>> GetRecentTransactionsAsync(RojmelDashboardQuery query, CancellationToken ct);
}

public interface IRojmelReportService
{
    Task<ApiResponse<PagedResult<RojmelTransactionDto>>> GetWalletLedgerAsync(RojmelReportQuery query, CancellationToken ct);
    Task<ApiResponse<PagedResult<RojmelTransactionDto>>> GetAllTransactionsAsync(RojmelReportQuery query, CancellationToken ct);
    Task<ApiResponse<RojmelIncomeExpenseReportDto>> GetIncomeExpenseAsync(RojmelReportQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<RojmelCategoryExpenseReportDto>>> GetCategoryWiseExpenseAsync(RojmelReportQuery query, CancellationToken ct);
    Task<ApiResponse<PagedResult<RojmelTransferDto>>> GetTransfersAsync(RojmelReportQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<RojmelDailyCashFlowDto>>> GetDailyCashFlowAsync(RojmelReportQuery query, CancellationToken ct);
    Task<ApiResponse<IReadOnlyCollection<RojmelUserWalletBalanceDto>>> GetUserWalletBalancesAsync(RojmelReportQuery query, CancellationToken ct);
}
