using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Abstractions.Services;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Reports;
using Cosmos.Shared.Responses;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Cosmos.Application.Services;

public sealed class ReportsService : IReportsService
{
    private readonly IReportsRepository _repository;
    private readonly IServiceProvider _serviceProvider;

    public ReportsService(IReportsRepository repository, IServiceProvider serviceProvider)
    {
        _repository = repository;
        _serviceProvider = serviceProvider;
    }

    public async Task<ApiResponse<SalesSummaryReportDto>> GetSalesSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<SalesSummaryReportDto>.Success(await _repository.GetSalesSummaryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PagedResult<SalesInvoiceRegisterReportDto>>> GetSalesInvoiceRegisterAsync(SalesInvoiceRegisterReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedResult<SalesInvoiceRegisterReportDto>>.Success(await _repository.GetSalesInvoiceRegisterAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<SalesByPartyReportDto>>> GetSalesByPartyAsync(SalesByPartyReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<SalesByPartyReportDto>>.Success(await _repository.GetSalesByPartyAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<SalesByItemReportDto>>> GetSalesByItemAsync(SalesByItemReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<SalesByItemReportDto>>.Success(await _repository.GetSalesByItemAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PagedResult<PaymentInReportDto>>> GetPaymentInAsync(PaymentInReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedResult<PaymentInReportDto>>.Success(await _repository.GetPaymentInAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>> GetCustomerReceivablesAsync(CustomerReceivablesReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>.Success(await _repository.GetCustomerReceivablesAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<SalesTaxSummaryReportDto>>> GetSalesTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<SalesTaxSummaryReportDto>>.Success(await _repository.GetSalesTaxSummaryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PurchaseSummaryReportDto>> GetPurchaseSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PurchaseSummaryReportDto>.Success(await _repository.GetPurchaseSummaryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PagedResult<PurchaseBillRegisterReportDto>>> GetPurchaseBillRegisterAsync(PurchaseBillRegisterReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedResult<PurchaseBillRegisterReportDto>>.Success(await _repository.GetPurchaseBillRegisterAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PurchaseBySupplierReportDto>>> GetPurchaseBySupplierAsync(PurchaseBySupplierReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PurchaseBySupplierReportDto>>.Success(await _repository.GetPurchaseBySupplierAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PurchaseByItemReportDto>>> GetPurchaseByItemAsync(PurchaseByItemReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PurchaseByItemReportDto>>.Success(await _repository.GetPurchaseByItemAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PagedResult<PaymentOutReportDto>>> GetPaymentOutAsync(PaymentOutReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedResult<PaymentOutReportDto>>.Success(await _repository.GetPaymentOutAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<SupplierPayableReportDto>>> GetSupplierPayablesAsync(SupplierPayablesReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<SupplierPayableReportDto>>.Success(await _repository.GetSupplierPayablesAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PurchaseTaxSummaryReportDto>>> GetPurchaseTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PurchaseTaxSummaryReportDto>>.Success(await _repository.GetPurchaseTaxSummaryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<ExpenseSummaryReportDto>> GetExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<ExpenseSummaryReportDto>.Success(await _repository.GetExpenseSummaryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<ExpenseByCategoryReportDto>>> GetExpenseByCategoryAsync(ExpenseReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<ExpenseByCategoryReportDto>>.Success(await _repository.GetExpenseByCategoryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<ExpenseByPartyReportDto>>> GetExpenseByPartyAsync(ExpenseReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<ExpenseByPartyReportDto>>.Success(await _repository.GetExpenseByPartyAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<MonthlyExpenseSummaryReportDto>>> GetMonthlyExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<MonthlyExpenseSummaryReportDto>>.Success(await _repository.GetMonthlyExpenseSummaryAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<StockSummaryTotalsDto, StockSummaryReportDto>>> GetStockSummaryAsync(InventoryReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<StockSummaryTotalsDto, StockSummaryReportDto>>.Success(
            WrapPaged("Stock Summary", await _repository.GetStockSummaryAsync(query, cancellationToken), query));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<StockLedgerTotalsDto, StockLedgerReportDto>>> GetStockLedgerAsync(StockLedgerReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<StockLedgerTotalsDto, StockLedgerReportDto>>.Success(
            WrapPaged("Stock Ledger", await _repository.GetStockLedgerAsync(query, cancellationToken), query));
    }

    public async Task<ApiResponse<InventoryReportResult<ItemLedgerSummaryDto, StockLedgerReportDto>>> GetItemLedgerAsync(long itemId, StockLedgerReportQuery query, CancellationToken cancellationToken)
    {
        query.ItemId = itemId;
        await ValidateAsync(query, cancellationToken);
        var result = await _repository.GetItemLedgerAsync(query, cancellationToken);
        result.ReportTitle = "Item Ledger";
        result.GeneratedAtUtc = DateTime.UtcNow;
        result.AppliedFilters = ToFilters(query);
        return ApiResponse<InventoryReportResult<ItemLedgerSummaryDto, StockLedgerReportDto>>.Success(result);
    }

    public async Task<ApiResponse<PagedResult<ItemMovementReportDto>>> GetItemMovementAsync(InventoryReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedResult<ItemMovementReportDto>>.Success(await _repository.GetItemMovementAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<StockExceptionSummaryDto, LowStockReportDto>>> GetLowStockAsync(LowStockReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<StockExceptionSummaryDto, LowStockReportDto>>.Success(
            WrapPaged("Low Stock", await _repository.GetLowStockAsync(query, cancellationToken), query));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<StockExceptionSummaryDto, NegativeStockReportDto>>> GetNegativeStockAsync(NegativeStockReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<StockExceptionSummaryDto, NegativeStockReportDto>>.Success(
            WrapPaged("Negative Stock", await _repository.GetNegativeStockAsync(query, cancellationToken), query));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<StockMovementSummaryDto, StockMovementReportRowDto>>> GetStockMovementsAsync(StockMovementReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<StockMovementSummaryDto, StockMovementReportRowDto>>.Success(
            WrapPaged("Stock Movements", await _repository.GetStockMovementsAsync(query, cancellationToken), query));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<StockValuationSummaryDto, StockValuationReportDto>>> GetStockValuationAsync(InventoryReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<StockValuationSummaryDto, StockValuationReportDto>>.Success(
            WrapPaged("Stock Valuation", await _repository.GetStockValuationAsync(query, cancellationToken), query, "ClosingQuantity x Items.PurchasePrice"));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<DeadStockSummaryDto, DeadStockReportDto>>> GetDeadStockAsync(StockAgeingReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<DeadStockSummaryDto, DeadStockReportDto>>.Success(
            WrapPaged("Dead Stock", await _repository.GetDeadStockAsync(query, cancellationToken), query, "ClosingQuantity x Items.PurchasePrice"));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<MovingItemsSummaryDto, FastMovingItemReportDto>>> GetFastMovingItemsAsync(MovingItemsReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<MovingItemsSummaryDto, FastMovingItemReportDto>>.Success(
            WrapPaged("Fast-Moving Items", await _repository.GetFastMovingItemsAsync(query, cancellationToken), query));
    }

    public async Task<ApiResponse<PagedInventoryReportResult<MovingItemsSummaryDto, SlowMovingItemReportDto>>> GetSlowMovingItemsAsync(MovingItemsReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedInventoryReportResult<MovingItemsSummaryDto, SlowMovingItemReportDto>>.Success(
            WrapPaged("Slow-Moving Items", await _repository.GetSlowMovingItemsAsync(query, cancellationToken), query, "CurrentStock x Items.PurchasePrice"));
    }

    public async Task<ApiResponse<PagedResult<PartyLedgerReportDto>>> GetPartyLedgerAsync(PartyReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<PagedResult<PartyLedgerReportDto>>.Success(await _repository.GetPartyLedgerAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>> GetCustomerStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>.Success(await _repository.GetCustomerStatementAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>> GetSupplierStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>.Success(await _repository.GetSupplierStatementAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<ReceivableAgingReportDto>>> GetReceivableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<ReceivableAgingReportDto>>.Success(await _repository.GetReceivableAgingAsync(query, cancellationToken));
    }

    public async Task<ApiResponse<IReadOnlyCollection<PayableAgingReportDto>>> GetPayableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken)
    {
        await ValidateAsync(query, cancellationToken);
        return ApiResponse<IReadOnlyCollection<PayableAgingReportDto>>.Success(await _repository.GetPayableAgingAsync(query, cancellationToken));
    }

    private Task ValidateAsync<T>(T query, CancellationToken cancellationToken)
    {
        var validator = _serviceProvider.GetRequiredService<IValidator<T>>();
        return ValidationRunner.ValidateAsync(validator, query, cancellationToken);
    }

    private static PagedInventoryReportResult<TSummary, TRow> WrapPaged<TSummary, TRow>(
        string title,
        InventoryReportData<TSummary, TRow> data,
        object query,
        string? valuationMethod = null) =>
        new()
        {
            ReportTitle = title,
            GeneratedAtUtc = DateTime.UtcNow,
            ValuationMethod = valuationMethod,
            AppliedFilters = ToFilters(query),
            Summary = data.Summary,
            Rows = data.Rows
        };

    private static InventoryReportFiltersDto ToFilters(object query) =>
        query switch
        {
            StockAgeingReportQuery q => new InventoryReportFiltersDto
            {
                FromDate = q.FromDate,
                ToDate = q.ToDate,
                AsOfDate = q.AsOfDate,
                ItemId = q.ItemId,
                CategoryId = q.CategoryId,
                Search = q.Search,
                IncludeInactive = q.IncludeInactive,
                InactiveDays = q.InactiveDays,
                MinimumStockValue = q.MinimumStockValue,
                SortBy = q.SortBy,
                SortDirection = q.SortDirection
            },
            MovingItemsReportQuery q => new InventoryReportFiltersDto
            {
                FromDate = q.FromDate,
                ToDate = q.ToDate,
                CategoryId = q.CategoryId,
                Search = q.Search,
                IncludeInactive = q.IncludeInactive,
                Top = q.Top,
                MinimumTransactions = q.MinimumTransactions,
                SortBy = q.SortBy,
                SortDirection = q.SortDirection
            },
            StockLedgerReportQuery q => new InventoryReportFiltersDto
            {
                FromDate = q.FromDate,
                ToDate = q.ToDate,
                AsOfDate = q.AsOfDate,
                ItemId = q.ItemId,
                CategoryId = q.CategoryId,
                UnitId = q.UnitId,
                PartyId = q.PartyId,
                Search = q.Search,
                StockStatus = q.StockStatus,
                MovementType = q.MovementType,
                SourceType = q.SourceType,
                IncludeInactive = q.IncludeInactive,
                SortBy = q.SortBy,
                SortDirection = q.SortDirection
            },
            InventoryReportQuery q => new InventoryReportFiltersDto
            {
                FromDate = q.FromDate,
                ToDate = q.ToDate,
                AsOfDate = q.AsOfDate,
                ItemId = q.ItemId,
                CategoryId = q.CategoryId,
                UnitId = q.UnitId,
                Search = q.Search,
                StockStatus = q.StockStatus,
                IncludeInactive = q.IncludeInactive,
                SortBy = q.SortBy,
                SortDirection = q.SortDirection
            },
            LowStockReportQuery q => new InventoryReportFiltersDto
            {
                FromDate = q.FromDate,
                ToDate = q.ToDate,
                CategoryId = q.CategoryId,
                UnitId = q.UnitId,
                Search = q.Search,
                IncludeInactive = q.IncludeInactive,
                SortBy = q.SortBy,
                SortDirection = q.SortDirection
            },
            NegativeStockReportQuery q => new InventoryReportFiltersDto
            {
                FromDate = q.FromDate,
                ToDate = q.ToDate,
                CategoryId = q.CategoryId,
                UnitId = q.UnitId,
                Search = q.Search,
                IncludeInactive = q.IncludeInactive,
                SortBy = q.SortBy,
                SortDirection = q.SortDirection
            },
            _ => new InventoryReportFiltersDto()
        };
}
