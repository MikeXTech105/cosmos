using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Rojmel;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;
using Cosmos.Shared.Exceptions;

namespace Cosmos.Persistence.Repositories;

public sealed class RojmelRepository : IRojmelRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public RojmelRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public async Task<PagedResult<RojmelWalletDto>> GetWalletsAsync(RojmelWalletListQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        Page(await QueryAsync<RojmelWalletDto>("usp_Wallet_GetList", new { query.Search, query.WalletType, query.LinkedUserId, query.IsActive, query.PageNumber, query.PageSize, query.SortBy, query.SortDirection, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct), query.PageNumber, query.PageSize);

    public Task<RojmelWalletDto?> GetWalletAsync(long id, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QuerySingleAsync<RojmelWalletDto>("usp_Wallet_GetById", new { Id = id, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public Task<RojmelWalletDto?> GetMyWalletAsync(int userId, CancellationToken ct) =>
        QuerySingleAsync<RojmelWalletDto>("usp_Wallet_GetMyWallet", new { CurrentUserId = userId }, ct);

    public Task<RojmelWalletDto> CreateWalletAsync(CreateRojmelWalletRequest request, int userId, CancellationToken ct) =>
        QueryWithStatusAsync<RojmelWalletDto>("usp_Wallet_Create", new { request.WalletCode, request.WalletName, request.WalletType, request.LinkedUserId, request.OpeningBalance, request.IsDefault, request.IsActive, request.Notes, CurrentUserId = userId }, ct);

    public Task<RojmelWalletDto> UpdateWalletAsync(long id, UpdateRojmelWalletRequest request, int userId, CancellationToken ct) =>
        QueryWithStatusAsync<RojmelWalletDto>("usp_Wallet_Update", new { Id = id, request.WalletName, request.WalletType, request.LinkedUserId, request.IsDefault, request.Notes, CurrentUserId = userId }, ct);

    public async Task SetWalletStatusAsync(long id, bool isActive, int userId, CancellationToken ct) =>
        ThrowIfFailed(await ExecuteStatusAsync("usp_Wallet_SetActive", new { Id = id, IsActive = isActive, CurrentUserId = userId }, ct));

    public Task<WalletBalanceDto?> GetBalanceAsync(long walletId, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QuerySingleAsync<WalletBalanceDto>("usp_Wallet_GetBalance", new { WalletId = walletId, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public Task<IReadOnlyCollection<RojmelCategoryDto>> GetCategoriesAsync(WalletCategoryType? categoryType, CancellationToken ct) =>
        QueryAsync<RojmelCategoryDto>("usp_WalletCategory_GetList", new { CategoryType = categoryType }, ct);

    public async Task<PagedResult<RojmelTransactionDto>> GetTransactionsAsync(RojmelTransactionListQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        Page(await QueryAsync<RojmelTransactionDto>("usp_WalletTransaction_GetList", new { query.FromDate, query.ToDate, query.WalletId, query.LinkedUserId, query.CategoryId, query.TransactionType, query.Status, query.Search, query.PageNumber, query.PageSize, query.SortBy, query.SortDirection, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct), query.PageNumber, query.PageSize);

    public Task<RojmelTransactionDto?> GetTransactionAsync(long id, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QuerySingleAsync<RojmelTransactionDto>("usp_WalletTransaction_GetById", new { Id = id, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public Task<RojmelTransactionDto> CreateTransactionAsync(WalletTransactionType type, CreateRojmelTransactionRequest request, int userId, bool canAccessAllWallets, CancellationToken ct)
    {
        var procedure = type switch
        {
            WalletTransactionType.Income => "usp_WalletTransaction_CreateIncome",
            WalletTransactionType.Expense => "usp_WalletTransaction_CreateExpense",
            _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Only income or expense can be created directly.")
        };
        return QueryWithStatusAsync<RojmelTransactionDto>(procedure, new { request.WalletId, request.TransactionDate, request.CategoryId, request.Amount, request.PaymentMode, request.Description, request.ReferenceNo, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);
    }

    public Task<RojmelTransactionDto> CreateAdjustmentAsync(CreateRojmelAdjustmentRequest request, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryWithStatusAsync<RojmelTransactionDto>("usp_WalletTransaction_CreateAdjustment", new { request.WalletId, request.TransactionDate, request.IsIncrease, request.Amount, request.Description, request.ReferenceNo, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public async Task CancelTransactionAsync(long id, string reason, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        ThrowIfFailed(await ExecuteStatusAsync("usp_WalletTransaction_Cancel", new { Id = id, Reason = reason, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct));

    public async Task<PagedResult<RojmelTransferDto>> GetTransfersAsync(RojmelTransferListQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        Page(await QueryAsync<RojmelTransferDto>("usp_WalletTransfer_GetList", new { query.FromDate, query.ToDate, query.WalletId, query.Status, query.Search, query.PageNumber, query.PageSize, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct), query.PageNumber, query.PageSize);

    public Task<RojmelTransferDto?> GetTransferAsync(long id, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QuerySingleAsync<RojmelTransferDto>("usp_WalletTransfer_GetById", new { Id = id, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public Task<RojmelTransferDto> CreateTransferAsync(CreateRojmelTransferRequest request, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryWithStatusAsync<RojmelTransferDto>("usp_WalletTransfer_Create", new { request.TransferDate, request.FromWalletId, request.ToWalletId, request.Amount, request.Description, request.ReferenceNo, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public async Task CancelTransferAsync(long id, string reason, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        ThrowIfFailed(await ExecuteStatusAsync("usp_WalletTransfer_Cancel", new { Id = id, Reason = reason, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct));

    public async Task<RojmelDashboardSummaryDto> GetDashboardSummaryAsync(RojmelDashboardQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        await QuerySingleAsync<RojmelDashboardSummaryDto>("usp_RojmelDashboard_Summary", new { query.FromDate, query.ToDate, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct)
        ?? throw new CosmosException("Rojmel dashboard data could not be loaded.", 500);

    public Task<IReadOnlyCollection<RojmelWalletBalanceRowDto>> GetDashboardWalletBalancesAsync(int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryAsync<RojmelWalletBalanceRowDto>("usp_RojmelDashboard_WalletBalances", new { CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public Task<IReadOnlyCollection<RojmelTransactionDto>> GetRecentTransactionsAsync(int count, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryAsync<RojmelTransactionDto>("usp_RojmelDashboard_RecentTransactions", new { Count = count, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets }, ct);

    public async Task<PagedResult<RojmelTransactionDto>> GetWalletLedgerAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        Page(await QueryAsync<RojmelTransactionDto>("usp_RojmelReport_WalletLedger", ReportParameters(query, userId, canAccessAllWallets), ct), query.PageNumber, query.PageSize);

    public async Task<PagedResult<RojmelTransactionDto>> GetAllTransactionsReportAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        Page(await QueryAsync<RojmelTransactionDto>("usp_RojmelReport_AllTransactions", ReportParameters(query, userId, canAccessAllWallets), ct), query.PageNumber, query.PageSize);

    public async Task<RojmelIncomeExpenseReportDto> GetIncomeExpenseReportAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        await QuerySingleAsync<RojmelIncomeExpenseReportDto>("usp_RojmelReport_IncomeExpense", ReportParameters(query, userId, canAccessAllWallets), ct)
        ?? throw new CosmosException("Rojmel income and expense report data could not be loaded.", 500);

    public Task<IReadOnlyCollection<RojmelCategoryExpenseReportDto>> GetCategoryWiseExpenseAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryAsync<RojmelCategoryExpenseReportDto>("usp_RojmelReport_CategoryWiseExpense", ReportParameters(query, userId, canAccessAllWallets), ct);

    public async Task<PagedResult<RojmelTransferDto>> GetTransfersReportAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        Page(await QueryAsync<RojmelTransferDto>("usp_RojmelReport_Transfers", ReportParameters(query, userId, canAccessAllWallets), ct), query.PageNumber, query.PageSize);

    public Task<IReadOnlyCollection<RojmelDailyCashFlowDto>> GetDailyCashFlowAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryAsync<RojmelDailyCashFlowDto>("usp_RojmelReport_DailyCashFlow", ReportParameters(query, userId, canAccessAllWallets), ct);

    public Task<IReadOnlyCollection<RojmelUserWalletBalanceDto>> GetUserWalletBalancesAsync(RojmelReportQuery query, int userId, bool canAccessAllWallets, CancellationToken ct) =>
        QueryAsync<RojmelUserWalletBalanceDto>("usp_RojmelReport_UserWalletBalances", ReportParameters(query, userId, canAccessAllWallets), ct);

    private async Task<IReadOnlyCollection<T>> QueryAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T?> QuerySingleAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<T> QueryWithStatusAsync<T>(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.QueryWithStatusAsync<T>(connection, procedure, parameters, ct);
    }

    private async Task<OperationResult> ExecuteStatusAsync(string procedure, object? parameters, CancellationToken ct)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(ct);
        return await StoredProcedureExecutor.ExecuteStatusAsync(connection, procedure, parameters, ct);
    }

    private static void ThrowIfFailed(OperationResult result)
    {
        if (!result.Succeeded) throw new CosmosException(result.Message, result.StatusCode);
    }

    private static PagedResult<T> Page<T>(IReadOnlyCollection<T> rows, int pageNumber, int pageSize) where T : class
    {
        var total = rows.FirstOrDefault()?.GetType().GetProperty("TotalCount")?.GetValue(rows.First()) is int value ? value : 0;
        return new PagedResult<T>(rows, pageNumber, pageSize, total);
    }

    private static object ReportParameters(RojmelReportQuery query, int userId, bool canAccessAllWallets) => new
    {
        query.FromDate, query.ToDate, query.WalletId, query.LinkedUserId, query.CategoryId, query.TransactionType, query.Status,
        query.Search, query.PageNumber, query.PageSize, query.SortBy, query.SortDirection, CurrentUserId = userId, CanAccessAllWallets = canAccessAllWallets
    };
}
