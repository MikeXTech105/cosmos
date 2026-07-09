using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Contracts.Common;
using Cosmos.Contracts.Reports;
using Cosmos.Persistence.Connection;
using Cosmos.Persistence.Dapper;

namespace Cosmos.Persistence.Repositories;

public sealed class ReportsRepository : IReportsRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public ReportsRepository(ISqlConnectionFactory connectionFactory) => _connectionFactory = connectionFactory;

    public Task<SalesSummaryReportDto> GetSalesSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken) =>
        SingleRequired<SalesSummaryReportDto>("sp_Report_SalesSummary", query, cancellationToken);

    public Task<PagedResult<SalesInvoiceRegisterReportDto>> GetSalesInvoiceRegisterAsync(SalesInvoiceRegisterReportQuery query, CancellationToken cancellationToken) =>
        Paged<SalesInvoiceRegisterReportDto>("sp_Report_SalesInvoiceRegister", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<IReadOnlyCollection<SalesByPartyReportDto>> GetSalesByPartyAsync(SalesByPartyReportQuery query, CancellationToken cancellationToken) =>
        Many<SalesByPartyReportDto>("sp_Report_SalesByParty", query, cancellationToken);

    public Task<IReadOnlyCollection<SalesByItemReportDto>> GetSalesByItemAsync(SalesByItemReportQuery query, CancellationToken cancellationToken) =>
        Many<SalesByItemReportDto>("sp_Report_SalesByItem", query, cancellationToken);

    public Task<PagedResult<PaymentInReportDto>> GetPaymentInAsync(PaymentInReportQuery query, CancellationToken cancellationToken) =>
        Paged<PaymentInReportDto>("sp_Report_PaymentIn", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<IReadOnlyCollection<CustomerReceivableReportDto>> GetCustomerReceivablesAsync(CustomerReceivablesReportQuery query, CancellationToken cancellationToken) =>
        Many<CustomerReceivableReportDto>("sp_Report_CustomerReceivables", query, cancellationToken);

    public Task<IReadOnlyCollection<SalesTaxSummaryReportDto>> GetSalesTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken) =>
        Many<SalesTaxSummaryReportDto>("sp_Report_SalesTaxSummary", query, cancellationToken);

    public Task<PurchaseSummaryReportDto> GetPurchaseSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken) =>
        SingleRequired<PurchaseSummaryReportDto>("sp_Report_PurchaseSummary", query, cancellationToken);

    public Task<PagedResult<PurchaseBillRegisterReportDto>> GetPurchaseBillRegisterAsync(PurchaseBillRegisterReportQuery query, CancellationToken cancellationToken) =>
        Paged<PurchaseBillRegisterReportDto>("sp_Report_PurchaseBillRegister", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<IReadOnlyCollection<PurchaseBySupplierReportDto>> GetPurchaseBySupplierAsync(PurchaseBySupplierReportQuery query, CancellationToken cancellationToken) =>
        Many<PurchaseBySupplierReportDto>("sp_Report_PurchaseBySupplier", query, cancellationToken);

    public Task<IReadOnlyCollection<PurchaseByItemReportDto>> GetPurchaseByItemAsync(PurchaseByItemReportQuery query, CancellationToken cancellationToken) =>
        Many<PurchaseByItemReportDto>("sp_Report_PurchaseByItem", query, cancellationToken);

    public Task<PagedResult<PaymentOutReportDto>> GetPaymentOutAsync(PaymentOutReportQuery query, CancellationToken cancellationToken) =>
        Paged<PaymentOutReportDto>("sp_Report_PaymentOut", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<IReadOnlyCollection<SupplierPayableReportDto>> GetSupplierPayablesAsync(SupplierPayablesReportQuery query, CancellationToken cancellationToken) =>
        Many<SupplierPayableReportDto>("sp_Report_SupplierPayables", query, cancellationToken);

    public Task<IReadOnlyCollection<PurchaseTaxSummaryReportDto>> GetPurchaseTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken) =>
        Many<PurchaseTaxSummaryReportDto>("sp_Report_PurchaseTaxSummary", query, cancellationToken);

    public Task<ExpenseSummaryReportDto> GetExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken) =>
        SingleRequired<ExpenseSummaryReportDto>("sp_Report_ExpenseSummary", query, cancellationToken);

    public Task<IReadOnlyCollection<ExpenseByCategoryReportDto>> GetExpenseByCategoryAsync(ExpenseReportQuery query, CancellationToken cancellationToken) =>
        Many<ExpenseByCategoryReportDto>("sp_Report_ExpenseByCategory", query, cancellationToken);

    public Task<IReadOnlyCollection<ExpenseByPartyReportDto>> GetExpenseByPartyAsync(ExpenseReportQuery query, CancellationToken cancellationToken) =>
        Many<ExpenseByPartyReportDto>("sp_Report_ExpenseByParty", query, cancellationToken);

    public Task<IReadOnlyCollection<MonthlyExpenseSummaryReportDto>> GetMonthlyExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken) =>
        Many<MonthlyExpenseSummaryReportDto>("sp_Report_MonthlyExpenseSummary", query, cancellationToken);

    public Task<IReadOnlyCollection<StockSummaryReportDto>> GetStockSummaryAsync(InventoryReportQuery query, CancellationToken cancellationToken) =>
        Many<StockSummaryReportDto>("sp_Report_StockSummary", query, cancellationToken);

    public Task<PagedResult<StockLedgerReportDto>> GetStockLedgerAsync(InventoryReportQuery query, CancellationToken cancellationToken) =>
        Paged<StockLedgerReportDto>("sp_Report_StockLedger", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<PagedResult<ItemMovementReportDto>> GetItemMovementAsync(InventoryReportQuery query, CancellationToken cancellationToken) =>
        Paged<ItemMovementReportDto>("sp_Report_ItemMovement", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<IReadOnlyCollection<LowStockReportDto>> GetLowStockAsync(LowStockReportQuery query, CancellationToken cancellationToken) =>
        Many<LowStockReportDto>("sp_Report_LowStock", query, cancellationToken);

    public Task<IReadOnlyCollection<StockValuationReportDto>> GetStockValuationAsync(InventoryReportQuery query, CancellationToken cancellationToken) =>
        Many<StockValuationReportDto>("sp_Report_StockValuation", query, cancellationToken);

    public Task<PagedResult<PartyLedgerReportDto>> GetPartyLedgerAsync(PartyReportQuery query, CancellationToken cancellationToken) =>
        Paged<PartyLedgerReportDto>("sp_Report_PartyLedger", query, query.PageNumber, query.PageSize, cancellationToken);

    public Task<IReadOnlyCollection<PartyStatementReportDto>> GetCustomerStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken) =>
        Many<PartyStatementReportDto>("sp_Report_CustomerStatement", query, cancellationToken);

    public Task<IReadOnlyCollection<PartyStatementReportDto>> GetSupplierStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken) =>
        Many<PartyStatementReportDto>("sp_Report_SupplierStatement", query, cancellationToken);

    public Task<IReadOnlyCollection<ReceivableAgingReportDto>> GetReceivableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken) =>
        Many<ReceivableAgingReportDto>("sp_Report_ReceivableAging", query, cancellationToken);

    public Task<IReadOnlyCollection<PayableAgingReportDto>> GetPayableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken) =>
        Many<PayableAgingReportDto>("sp_Report_PayableAging", query, cancellationToken);

    private async Task<PagedResult<T>> Paged<T>(string storedProcedure, object parameters, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var rows = await Many<T>(storedProcedure, parameters, cancellationToken);
        var totalCount = rows.FirstOrDefault() is null
            ? 0
            : (int)(typeof(T).GetProperty("TotalCount")?.GetValue(rows.First()) ?? 0);

        return new PagedResult<T>(rows, pageNumber, pageSize, totalCount);
    }

    private async Task<IReadOnlyCollection<T>> Many<T>(string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QueryAsync<T>(connection, storedProcedure, parameters, cancellationToken);
    }

    private async Task<T?> Single<T>(string storedProcedure, object? parameters, CancellationToken cancellationToken)
    {
        using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        return await StoredProcedureExecutor.QuerySingleOrDefaultAsync<T>(connection, storedProcedure, parameters, cancellationToken);
    }

    private async Task<T> SingleRequired<T>(string storedProcedure, object? parameters, CancellationToken cancellationToken) where T : new() =>
        await Single<T>(storedProcedure, parameters, cancellationToken) ?? new T();
}
