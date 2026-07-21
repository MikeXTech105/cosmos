using Cosmos.API.Security;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Rojmel;
using Cosmos.Domain.Security;
using Cosmos.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cosmos.API.Controllers.Rojmel;

[Authorize]
[ApiExplorerSettings(GroupName = "rojmel")]
[Route("api/v1/rojmel/my-wallet")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
public sealed class RojmelMyWalletController(IRojmelWalletService wallets, IRojmelTransactionService transactions, IRojmelReportService reports) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(RojmelPermissions.MyWallet, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RojmelWalletDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => FromResponse(await wallets.GetMyWalletAsync(ct));

    [HttpGet("transactions")]
    [RequirePermission(RojmelPermissions.MyWallet, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Transactions([FromQuery] RojmelTransactionListQuery query, CancellationToken ct) => FromResponse(await transactions.GetTransactionsAsync(query, ct));

    [HttpGet("ledger")]
    [RequirePermission(RojmelPermissions.MyWallet, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Ledger([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await reports.GetWalletLedgerAsync(query, ct));

    [HttpGet("categories")]
    [RequirePermission(RojmelPermissions.MyWallet, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<RojmelCategoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Categories([FromQuery] WalletCategoryType? categoryType, CancellationToken ct) => FromResponse(await wallets.GetCategoriesAsync(categoryType, ct));

    [HttpPost("income")]
    [RequirePermission(RojmelPermissions.MyWallet, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransactionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Income([FromBody] CreateMyWalletTransactionRequest request, CancellationToken ct) => FromResponse(await transactions.CreateMyIncomeAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("expense")]
    [RequirePermission(RojmelPermissions.MyWallet, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransactionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Expense([FromBody] CreateMyWalletTransactionRequest request, CancellationToken ct) => FromResponse(await transactions.CreateMyExpenseAsync(request, ct), StatusCodes.Status201Created);
}

[Authorize]
[ApiExplorerSettings(GroupName = "rojmel")]
[Route("api/v1/rojmel/wallets")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
public sealed class RojmelWalletsController(IRojmelWalletService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(RojmelPermissions.Wallets, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelWalletDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] RojmelWalletListQuery query, CancellationToken ct) => FromResponse(await service.GetWalletsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(RojmelPermissions.Wallets, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RojmelWalletDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetWalletAsync(id, ct));

    [HttpPost]
    [RequirePermission(RojmelPermissions.Wallets, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<RojmelWalletDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateRojmelWalletRequest request, CancellationToken ct) => FromResponse(await service.CreateWalletAsync(request, ct), StatusCodes.Status201Created);

    [HttpPut("{id:long}")]
    [RequirePermission(RojmelPermissions.Wallets, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<RojmelWalletDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateRojmelWalletRequest request, CancellationToken ct) => FromResponse(await service.UpdateWalletAsync(id, request, ct));

    [HttpPatch("{id:long}/status")]
    [RequirePermission(RojmelPermissions.Wallets, PermissionAction.Delete)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetStatus(long id, [FromBody] ChangeRojmelWalletStatusRequest request, CancellationToken ct) => FromResponse(await service.SetWalletStatusAsync(id, request, ct));

    [HttpGet("{id:long}/balance")]
    [RequirePermission(RojmelPermissions.Wallets, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<WalletBalanceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Balance(long id, CancellationToken ct) => FromResponse(await service.GetBalanceAsync(id, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "rojmel")]
[Route("api/v1/rojmel/transactions")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
public sealed class RojmelTransactionsController(IRojmelTransactionService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(RojmelPermissions.Transactions, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] RojmelTransactionListQuery query, CancellationToken ct) => FromResponse(await service.GetTransactionsAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(RojmelPermissions.Transactions, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransactionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetTransactionAsync(id, ct));

    [HttpPost("income")]
    [RequirePermission(RojmelPermissions.Transactions, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransactionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Income([FromBody] CreateRojmelTransactionRequest request, CancellationToken ct) => FromResponse(await service.CreateIncomeAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("expense")]
    [RequirePermission(RojmelPermissions.Transactions, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransactionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Expense([FromBody] CreateRojmelTransactionRequest request, CancellationToken ct) => FromResponse(await service.CreateExpenseAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("adjustment")]
    [RequirePermission(RojmelPermissions.Transactions, PermissionAction.Edit)]
    [RequirePermission(RojmelPermissions.Admin, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransactionDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Adjustment([FromBody] CreateRojmelAdjustmentRequest request, CancellationToken ct) => FromResponse(await service.CreateAdjustmentAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(RojmelPermissions.Transactions, PermissionAction.Delete)]
    [RequirePermission(RojmelPermissions.Admin, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelRojmelTransactionRequest request, CancellationToken ct) => FromResponse(await service.CancelAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "rojmel")]
[Route("api/v1/rojmel/transfers")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status404NotFound)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status409Conflict)]
public sealed class RojmelTransfersController(IRojmelTransferService service) : ApiControllerBase
{
    [HttpGet]
    [RequirePermission(RojmelPermissions.Transfers, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransferDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] RojmelTransferListQuery query, CancellationToken ct) => FromResponse(await service.GetTransfersAsync(query, ct));

    [HttpGet("{id:long}")]
    [RequirePermission(RojmelPermissions.Transfers, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransferDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(long id, CancellationToken ct) => FromResponse(await service.GetTransferAsync(id, ct));

    [HttpPost]
    [RequirePermission(RojmelPermissions.Transfers, PermissionAction.Create)]
    [ProducesResponseType(typeof(ApiResponse<RojmelTransferDto>), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateRojmelTransferRequest request, CancellationToken ct) => FromResponse(await service.CreateAsync(request, ct), StatusCodes.Status201Created);

    [HttpPost("{id:long}/cancel")]
    [RequirePermission(RojmelPermissions.Transfers, PermissionAction.Delete)]
    [RequirePermission(RojmelPermissions.Admin, PermissionAction.Edit)]
    [ProducesResponseType(typeof(ApiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(long id, [FromBody] CancelRojmelTransferRequest request, CancellationToken ct) => FromResponse(await service.CancelAsync(id, request, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "rojmel")]
[Route("api/v1/rojmel/dashboard")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
public sealed class RojmelDashboardController(IRojmelDashboardService service) : ApiControllerBase
{
    [HttpGet("summary")]
    [RequirePermission(RojmelPermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RojmelDashboardSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary([FromQuery] RojmelDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetSummaryAsync(query, ct));

    [HttpGet("wallet-balances")]
    [RequirePermission(RojmelPermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<RojmelWalletBalanceRowDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> WalletBalances(CancellationToken ct) => FromResponse(await service.GetWalletBalancesAsync(ct));

    [HttpGet("recent-transactions")]
    [RequirePermission(RojmelPermissions.Dashboard, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<RojmelTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecentTransactions([FromQuery] RojmelDashboardQuery query, CancellationToken ct) => FromResponse(await service.GetRecentTransactionsAsync(query, ct));
}

[Authorize]
[ApiExplorerSettings(GroupName = "rojmel")]
[Route("api/v1/rojmel/reports")]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ApiResponse), StatusCodes.Status403Forbidden)]
public sealed class RojmelReportsController(IRojmelReportService service) : ApiControllerBase
{
    [HttpGet("wallet-ledger")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> WalletLedger([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetWalletLedgerAsync(query, ct));

    [HttpGet("all-transactions")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransactionDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AllTransactions([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetAllTransactionsAsync(query, ct));

    [HttpGet("income-expense")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<RojmelIncomeExpenseReportDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> IncomeExpense([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetIncomeExpenseAsync(query, ct));

    [HttpGet("category-wise-expense")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<RojmelCategoryExpenseReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CategoryWiseExpense([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetCategoryWiseExpenseAsync(query, ct));

    [HttpGet("transfers")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RojmelTransferDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Transfers([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetTransfersAsync(query, ct));

    [HttpGet("daily-cash-flow")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<RojmelDailyCashFlowDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DailyCashFlow([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetDailyCashFlowAsync(query, ct));

    [HttpGet("user-wallet-balances")]
    [RequirePermission(RojmelPermissions.Reports, PermissionAction.View)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<RojmelUserWalletBalanceDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UserWalletBalances([FromQuery] RojmelReportQuery query, CancellationToken ct) => FromResponse(await service.GetUserWalletBalancesAsync(query, ct));
}
