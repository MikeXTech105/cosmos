using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Application.Rojmel;
using Cosmos.Contracts.Audit;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Rojmel;
using Cosmos.Domain.Security;
using Cosmos.Shared.Exceptions;
using Cosmos.Shared.Responses;
using Cosmos.Shared.Security;
using FluentValidation;

namespace Cosmos.Application.Services;

public abstract class RojmelServiceBase
{
    protected readonly IRojmelRepository Repository;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUser _currentUser;
    private readonly IPermissionService _permissions;

    protected RojmelServiceBase(IRojmelRepository repository, IAuditRepository audit, ICurrentUser currentUser, IPermissionService permissions)
    {
        Repository = repository;
        _audit = audit;
        _currentUser = currentUser;
        _permissions = permissions;
    }

    protected async Task<RojmelAccessScope> GetScopeAsync(CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedCosmosException("An authenticated user is required for Rojmel operations.");
        var allWallets = await _permissions.UserHasPermissionAsync(userId, RojmelPermissions.Admin, PermissionAction.View, ct);
        return new RojmelAccessScope(userId, allWallets);
    }

    protected async Task<RojmelAccessScope> RequireAllWalletAccessAsync(CancellationToken ct)
    {
        var scope = await GetScopeAsync(ct);
        if (!scope.CanAccessAllWallets) throw new CosmosException("This operation requires Rojmel administrator access.", 403);
        return scope;
    }

    protected static T Found<T>(T? value, string name) where T : class => value ?? throw new NotFoundException($"{name} was not found or is not available to the current user.");

    protected Task AuditAsync(string table, long id, string action, object? before, object? after, int userId, CancellationToken ct) =>
        _audit.AddAsync(new AuditEntryRequest(table, id.ToString(), action, before is null ? null : AuditSerializer.Serialize(before), after is null ? null : AuditSerializer.Serialize(after), userId), ct);

    protected static CreateRojmelTransactionRequest ToWalletRequest(long walletId, CreateMyWalletTransactionRequest request) =>
        new(walletId, request.TransactionDate, request.CategoryId, request.Amount, TrimToNull(request.PaymentMode), TrimToNull(request.Description), TrimToNull(request.ReferenceNo));

    protected static CreateRojmelTransactionRequest Normalize(CreateRojmelTransactionRequest request) =>
        request with { PaymentMode = TrimToNull(request.PaymentMode), Description = TrimToNull(request.Description), ReferenceNo = TrimToNull(request.ReferenceNo) };

    protected static CreateRojmelAdjustmentRequest Normalize(CreateRojmelAdjustmentRequest request) =>
        request with { Description = TrimToNull(request.Description), ReferenceNo = TrimToNull(request.ReferenceNo) };

    protected static CreateRojmelTransferRequest Normalize(CreateRojmelTransferRequest request) =>
        request with { Description = TrimToNull(request.Description), ReferenceNo = TrimToNull(request.ReferenceNo) };

    protected static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class RojmelWalletService : RojmelServiceBase, IRojmelWalletService
{
    private readonly IValidator<RojmelWalletListQuery> _listValidator;
    private readonly IValidator<CreateRojmelWalletRequest> _createValidator;
    private readonly IValidator<UpdateRojmelWalletRequest> _updateValidator;

    public RojmelWalletService(IRojmelRepository repository, IAuditRepository audit, ICurrentUser currentUser, IPermissionService permissions,
        IValidator<RojmelWalletListQuery> listValidator, IValidator<CreateRojmelWalletRequest> createValidator, IValidator<UpdateRojmelWalletRequest> updateValidator)
        : base(repository, audit, currentUser, permissions) => (_listValidator, _createValidator, _updateValidator) = (listValidator, createValidator, updateValidator);

    public async Task<ApiResponse<PagedResult<RojmelWalletDto>>> GetWalletsAsync(RojmelWalletListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, ct);
        var scope = await RequireAllWalletAccessAsync(ct);
        return ApiResponse<PagedResult<RojmelWalletDto>>.Success(await Repository.GetWalletsAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<RojmelWalletDto>> GetWalletAsync(long id, CancellationToken ct)
    {
        var scope = await RequireAllWalletAccessAsync(ct);
        return ApiResponse<RojmelWalletDto>.Success(Found(await Repository.GetWalletAsync(id, scope.UserId, scope.CanAccessAllWallets, ct), "Wallet"));
    }

    public async Task<ApiResponse<RojmelWalletDto>> CreateWalletAsync(CreateRojmelWalletRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, ct);
        var scope = await RequireAllWalletAccessAsync(ct);
        var normalized = request with { WalletCode = request.WalletCode.Trim().ToUpperInvariant(), WalletName = request.WalletName.Trim(), Notes = TrimToNull(request.Notes) };
        var wallet = await Repository.CreateWalletAsync(normalized, scope.UserId, ct);
        await AuditAsync("Wallets", wallet.Id, "Create", null, wallet, scope.UserId, ct);
        return ApiResponse<RojmelWalletDto>.Success(wallet, "Wallet created.");
    }

    public async Task<ApiResponse<RojmelWalletDto>> UpdateWalletAsync(long id, UpdateRojmelWalletRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_updateValidator, request, ct);
        var scope = await RequireAllWalletAccessAsync(ct);
        var before = Found(await Repository.GetWalletAsync(id, scope.UserId, true, ct), "Wallet");
        var normalized = request with { WalletName = request.WalletName.Trim(), Notes = TrimToNull(request.Notes) };
        var wallet = await Repository.UpdateWalletAsync(id, normalized, scope.UserId, ct);
        await AuditAsync("Wallets", id, "Update", before, wallet, scope.UserId, ct);
        return ApiResponse<RojmelWalletDto>.Success(wallet, "Wallet updated.");
    }

    public async Task<ApiResponse> SetWalletStatusAsync(long id, ChangeRojmelWalletStatusRequest request, CancellationToken ct)
    {
        var scope = await RequireAllWalletAccessAsync(ct);
        var before = Found(await Repository.GetWalletAsync(id, scope.UserId, true, ct), "Wallet");
        await Repository.SetWalletStatusAsync(id, request.IsActive, scope.UserId, ct);
        var after = Found(await Repository.GetWalletAsync(id, scope.UserId, true, ct), "Wallet");
        await AuditAsync("Wallets", id, request.IsActive ? "Activate" : "Deactivate", before, after, scope.UserId, ct);
        return ApiResponse.Success(request.IsActive ? "Wallet activated." : "Wallet deactivated.");
    }

    public async Task<ApiResponse<WalletBalanceDto>> GetBalanceAsync(long id, CancellationToken ct)
    {
        var scope = await GetScopeAsync(ct);
        return ApiResponse<WalletBalanceDto>.Success(Found(await Repository.GetBalanceAsync(id, scope.UserId, scope.CanAccessAllWallets, ct), "Wallet balance"));
    }

    public async Task<ApiResponse<IReadOnlyCollection<RojmelCategoryDto>>> GetCategoriesAsync(WalletCategoryType? categoryType, CancellationToken ct) =>
        ApiResponse<IReadOnlyCollection<RojmelCategoryDto>>.Success(await Repository.GetCategoriesAsync(categoryType, ct));

    public async Task<ApiResponse<RojmelWalletDto>> GetMyWalletAsync(CancellationToken ct)
    {
        var scope = await GetScopeAsync(ct);
        return ApiResponse<RojmelWalletDto>.Success(Found(await Repository.GetMyWalletAsync(scope.UserId, ct), "Primary wallet"));
    }
}

public sealed class RojmelTransactionService : RojmelServiceBase, IRojmelTransactionService
{
    private readonly IValidator<RojmelTransactionListQuery> _listValidator;
    private readonly IValidator<CreateRojmelTransactionRequest> _transactionValidator;
    private readonly IValidator<CreateMyWalletTransactionRequest> _myTransactionValidator;
    private readonly IValidator<CreateRojmelAdjustmentRequest> _adjustmentValidator;
    private readonly IValidator<CancelRojmelTransactionRequest> _cancelValidator;

    public RojmelTransactionService(IRojmelRepository repository, IAuditRepository audit, ICurrentUser currentUser, IPermissionService permissions,
        IValidator<RojmelTransactionListQuery> listValidator, IValidator<CreateRojmelTransactionRequest> transactionValidator,
        IValidator<CreateMyWalletTransactionRequest> myTransactionValidator, IValidator<CreateRojmelAdjustmentRequest> adjustmentValidator,
        IValidator<CancelRojmelTransactionRequest> cancelValidator)
        : base(repository, audit, currentUser, permissions) => (_listValidator, _transactionValidator, _myTransactionValidator, _adjustmentValidator, _cancelValidator) = (listValidator, transactionValidator, myTransactionValidator, adjustmentValidator, cancelValidator);

    public async Task<ApiResponse<PagedResult<RojmelTransactionDto>>> GetTransactionsAsync(RojmelTransactionListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<PagedResult<RojmelTransactionDto>>.Success(await Repository.GetTransactionsAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<RojmelTransactionDto>> GetTransactionAsync(long id, CancellationToken ct)
    {
        var scope = await GetScopeAsync(ct);
        return ApiResponse<RojmelTransactionDto>.Success(Found(await Repository.GetTransactionAsync(id, scope.UserId, scope.CanAccessAllWallets, ct), "Wallet transaction"));
    }

    public Task<ApiResponse<RojmelTransactionDto>> CreateIncomeAsync(CreateRojmelTransactionRequest request, CancellationToken ct) => CreateAsync(WalletTransactionType.Income, request, ct);
    public Task<ApiResponse<RojmelTransactionDto>> CreateExpenseAsync(CreateRojmelTransactionRequest request, CancellationToken ct) => CreateAsync(WalletTransactionType.Expense, request, ct);

    public async Task<ApiResponse<RojmelTransactionDto>> CreateMyIncomeAsync(CreateMyWalletTransactionRequest request, CancellationToken ct) =>
        await CreateForMyWalletAsync(WalletTransactionType.Income, request, ct);

    public async Task<ApiResponse<RojmelTransactionDto>> CreateMyExpenseAsync(CreateMyWalletTransactionRequest request, CancellationToken ct) =>
        await CreateForMyWalletAsync(WalletTransactionType.Expense, request, ct);

    private async Task<ApiResponse<RojmelTransactionDto>> CreateForMyWalletAsync(WalletTransactionType type, CreateMyWalletTransactionRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_myTransactionValidator, request, ct);
        var scope = await GetScopeAsync(ct);
        var wallet = Found(await Repository.GetMyWalletAsync(scope.UserId, ct), "Primary wallet");
        return await CreateAsync(type, ToWalletRequest(wallet.Id, request), ct, scope);
    }

    private async Task<ApiResponse<RojmelTransactionDto>> CreateAsync(WalletTransactionType type, CreateRojmelTransactionRequest request, CancellationToken ct, RojmelAccessScope? existingScope = null)
    {
        await ValidationRunner.ValidateAsync(_transactionValidator, request, ct);
        var scope = existingScope ?? await GetScopeAsync(ct);
        var transaction = await Repository.CreateTransactionAsync(type, Normalize(request), scope.UserId, scope.CanAccessAllWallets, ct);
        await AuditAsync("WalletTransactions", transaction.Id, type.ToString(), null, transaction, scope.UserId, ct);
        return ApiResponse<RojmelTransactionDto>.Success(transaction, $"Wallet {type.ToString().ToLowerInvariant()} recorded.");
    }

    public async Task<ApiResponse<RojmelTransactionDto>> CreateAdjustmentAsync(CreateRojmelAdjustmentRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_adjustmentValidator, request, ct);
        var scope = await RequireAllWalletAccessAsync(ct);
        var transaction = await Repository.CreateAdjustmentAsync(Normalize(request), scope.UserId, true, ct);
        await AuditAsync("WalletTransactions", transaction.Id, request.IsIncrease ? "AdjustmentIn" : "AdjustmentOut", null, transaction, scope.UserId, ct);
        return ApiResponse<RojmelTransactionDto>.Success(transaction, "Wallet adjustment recorded.");
    }

    public async Task<ApiResponse> CancelAsync(long id, CancelRojmelTransactionRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_cancelValidator, request, ct);
        var scope = await RequireAllWalletAccessAsync(ct);
        var before = Found(await Repository.GetTransactionAsync(id, scope.UserId, true, ct), "Wallet transaction");
        await Repository.CancelTransactionAsync(id, request.Reason.Trim(), scope.UserId, true, ct);
        var after = Found(await Repository.GetTransactionAsync(id, scope.UserId, true, ct), "Wallet transaction");
        await AuditAsync("WalletTransactions", id, "Cancel", before, after, scope.UserId, ct);
        return ApiResponse.Success("Wallet transaction cancelled through a reversal entry.");
    }
}

public sealed class RojmelTransferService : RojmelServiceBase, IRojmelTransferService
{
    private readonly IValidator<RojmelTransferListQuery> _listValidator;
    private readonly IValidator<CreateRojmelTransferRequest> _createValidator;
    private readonly IValidator<CancelRojmelTransferRequest> _cancelValidator;

    public RojmelTransferService(IRojmelRepository repository, IAuditRepository audit, ICurrentUser currentUser, IPermissionService permissions,
        IValidator<RojmelTransferListQuery> listValidator, IValidator<CreateRojmelTransferRequest> createValidator, IValidator<CancelRojmelTransferRequest> cancelValidator)
        : base(repository, audit, currentUser, permissions) => (_listValidator, _createValidator, _cancelValidator) = (listValidator, createValidator, cancelValidator);

    public async Task<ApiResponse<PagedResult<RojmelTransferDto>>> GetTransfersAsync(RojmelTransferListQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_listValidator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<PagedResult<RojmelTransferDto>>.Success(await Repository.GetTransfersAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<RojmelTransferDto>> GetTransferAsync(long id, CancellationToken ct)
    {
        var scope = await GetScopeAsync(ct);
        return ApiResponse<RojmelTransferDto>.Success(Found(await Repository.GetTransferAsync(id, scope.UserId, scope.CanAccessAllWallets, ct), "Wallet transfer"));
    }

    public async Task<ApiResponse<RojmelTransferDto>> CreateAsync(CreateRojmelTransferRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_createValidator, request, ct);
        var scope = await GetScopeAsync(ct);
        var transfer = await Repository.CreateTransferAsync(Normalize(request), scope.UserId, scope.CanAccessAllWallets, ct);
        await AuditAsync("WalletTransfers", transfer.Id, "Create", null, transfer, scope.UserId, ct);
        return ApiResponse<RojmelTransferDto>.Success(transfer, "Wallet transfer posted. It is excluded from income and expense totals.");
    }

    public async Task<ApiResponse> CancelAsync(long id, CancelRojmelTransferRequest request, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_cancelValidator, request, ct);
        var scope = await RequireAllWalletAccessAsync(ct);
        var before = Found(await Repository.GetTransferAsync(id, scope.UserId, true, ct), "Wallet transfer");
        await Repository.CancelTransferAsync(id, request.Reason.Trim(), scope.UserId, true, ct);
        var after = Found(await Repository.GetTransferAsync(id, scope.UserId, true, ct), "Wallet transfer");
        await AuditAsync("WalletTransfers", id, "Cancel", before, after, scope.UserId, ct);
        return ApiResponse.Success("Wallet transfer cancelled through linked reversal entries.");
    }
}

public sealed class RojmelDashboardService : RojmelServiceBase, IRojmelDashboardService
{
    private readonly IValidator<RojmelDashboardQuery> _validator;

    public RojmelDashboardService(IRojmelRepository repository, IAuditRepository audit, ICurrentUser currentUser, IPermissionService permissions, IValidator<RojmelDashboardQuery> validator)
        : base(repository, audit, currentUser, permissions) => _validator = validator;

    public async Task<ApiResponse<RojmelDashboardSummaryDto>> GetSummaryAsync(RojmelDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<RojmelDashboardSummaryDto>.Success(await Repository.GetDashboardSummaryAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<RojmelWalletBalanceRowDto>>> GetWalletBalancesAsync(CancellationToken ct)
    {
        var scope = await GetScopeAsync(ct);
        return ApiResponse<IReadOnlyCollection<RojmelWalletBalanceRowDto>>.Success(await Repository.GetDashboardWalletBalancesAsync(scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<RojmelTransactionDto>>> GetRecentTransactionsAsync(RojmelDashboardQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<IReadOnlyCollection<RojmelTransactionDto>>.Success(await Repository.GetRecentTransactionsAsync(query.RecentTransactionCount, scope.UserId, scope.CanAccessAllWallets, ct));
    }
}

public sealed class RojmelReportService : RojmelServiceBase, IRojmelReportService
{
    private readonly IValidator<RojmelReportQuery> _validator;

    public RojmelReportService(IRojmelRepository repository, IAuditRepository audit, ICurrentUser currentUser, IPermissionService permissions, IValidator<RojmelReportQuery> validator)
        : base(repository, audit, currentUser, permissions) => _validator = validator;

    public async Task<ApiResponse<PagedResult<RojmelTransactionDto>>> GetWalletLedgerAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<PagedResult<RojmelTransactionDto>>.Success(await Repository.GetWalletLedgerAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<PagedResult<RojmelTransactionDto>>> GetAllTransactionsAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<PagedResult<RojmelTransactionDto>>.Success(await Repository.GetAllTransactionsReportAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<RojmelIncomeExpenseReportDto>> GetIncomeExpenseAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<RojmelIncomeExpenseReportDto>.Success(await Repository.GetIncomeExpenseReportAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<RojmelCategoryExpenseReportDto>>> GetCategoryWiseExpenseAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<IReadOnlyCollection<RojmelCategoryExpenseReportDto>>.Success(await Repository.GetCategoryWiseExpenseAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<PagedResult<RojmelTransferDto>>> GetTransfersAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<PagedResult<RojmelTransferDto>>.Success(await Repository.GetTransfersReportAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<RojmelDailyCashFlowDto>>> GetDailyCashFlowAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<IReadOnlyCollection<RojmelDailyCashFlowDto>>.Success(await Repository.GetDailyCashFlowAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }

    public async Task<ApiResponse<IReadOnlyCollection<RojmelUserWalletBalanceDto>>> GetUserWalletBalancesAsync(RojmelReportQuery query, CancellationToken ct)
    {
        await ValidationRunner.ValidateAsync(_validator, query, ct);
        var scope = await GetScopeAsync(ct);
        return ApiResponse<IReadOnlyCollection<RojmelUserWalletBalanceDto>>.Success(await Repository.GetUserWalletBalancesAsync(query, scope.UserId, scope.CanAccessAllWallets, ct));
    }
}
