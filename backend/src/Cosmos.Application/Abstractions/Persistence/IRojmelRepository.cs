using Cosmos.Contracts.Common;
using Cosmos.Contracts.Rojmel;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IRojmelRepository
{
    Task<PagedResult<RojmelWalletDto>> GetWalletsAsync(RojmelWalletListQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelWalletDto?> GetWalletAsync(long id, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelWalletDto?> GetMyWalletAsync(int userId, CancellationToken ct);
    Task<RojmelWalletDto> CreateWalletAsync(CreateRojmelWalletRequest request, int userId, CancellationToken ct);
    Task<RojmelWalletDto> UpdateWalletAsync(long id, UpdateRojmelWalletRequest request, int userId, CancellationToken ct);
    Task SetWalletStatusAsync(long id, bool isActive, int userId, CancellationToken ct);
    Task<WalletBalanceDto?> GetBalanceAsync(long walletId, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<IReadOnlyCollection<RojmelCategoryDto>> GetCategoriesAsync(WalletCategoryType? categoryType, CancellationToken ct);

    Task<PagedResult<RojmelTransactionDto>> GetTransactionsAsync(RojmelTransactionListQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelTransactionDto?> GetTransactionAsync(long id, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelTransactionDto> CreateTransactionAsync(WalletTransactionType type, CreateRojmelTransactionRequest request, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelTransactionDto> CreateAdjustmentAsync(CreateRojmelAdjustmentRequest request, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task CancelTransactionAsync(long id, string reason, int userId, bool canAccessAllWallets, CancellationToken ct);

    Task<PagedResult<RojmelTransferDto>> GetTransfersAsync(RojmelTransferListQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelTransferDto?> GetTransferAsync(long id, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelTransferDto> CreateTransferAsync(CreateRojmelTransferRequest request, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task CancelTransferAsync(long id, string reason, int userId, bool canAccessAllWallets, CancellationToken ct);

    Task<RojmelDashboardSummaryDto> GetDashboardSummaryAsync(RojmelDashboardQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<IReadOnlyCollection<RojmelWalletBalanceRowDto>> GetDashboardWalletBalancesAsync(int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<IReadOnlyCollection<RojmelTransactionDto>> GetRecentTransactionsAsync(int count, int userId, bool canAccessAllWallets, CancellationToken ct);

    Task<PagedResult<RojmelTransactionDto>> GetWalletLedgerAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<PagedResult<RojmelTransactionDto>> GetAllTransactionsReportAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<RojmelIncomeExpenseReportDto> GetIncomeExpenseReportAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<IReadOnlyCollection<RojmelCategoryExpenseReportDto>> GetCategoryWiseExpenseAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<PagedResult<RojmelTransferDto>> GetTransfersReportAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<IReadOnlyCollection<RojmelDailyCashFlowDto>> GetDailyCashFlowAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
    Task<IReadOnlyCollection<RojmelUserWalletBalanceDto>> GetUserWalletBalancesAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct);
}
