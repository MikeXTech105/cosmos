using Cosmos.Contracts.Common;
using Cosmos.Contracts.Reports;

namespace Cosmos.Application.Abstractions.Persistence;

public interface IReportsRepository
{
    Task<SalesSummaryReportDto> GetSalesSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);
    Task<PagedResult<SalesInvoiceRegisterReportDto>> GetSalesInvoiceRegisterAsync(SalesInvoiceRegisterReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SalesByPartyReportDto>> GetSalesByPartyAsync(SalesByPartyReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SalesByItemReportDto>> GetSalesByItemAsync(SalesByItemReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<PaymentInReportDto>> GetPaymentInAsync(PaymentInReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CustomerReceivableReportDto>> GetCustomerReceivablesAsync(CustomerReceivablesReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SalesTaxSummaryReportDto>> GetSalesTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);

    Task<PurchaseSummaryReportDto> GetPurchaseSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);
    Task<PagedResult<PurchaseBillRegisterReportDto>> GetPurchaseBillRegisterAsync(PurchaseBillRegisterReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PurchaseBySupplierReportDto>> GetPurchaseBySupplierAsync(PurchaseBySupplierReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PurchaseByItemReportDto>> GetPurchaseByItemAsync(PurchaseByItemReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<PaymentOutReportDto>> GetPaymentOutAsync(PaymentOutReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SupplierPayableReportDto>> GetSupplierPayablesAsync(SupplierPayablesReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PurchaseTaxSummaryReportDto>> GetPurchaseTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);

    Task<ExpenseSummaryReportDto> GetExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ExpenseByCategoryReportDto>> GetExpenseByCategoryAsync(ExpenseReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ExpenseByPartyReportDto>> GetExpenseByPartyAsync(ExpenseReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<MonthlyExpenseSummaryReportDto>> GetMonthlyExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<StockSummaryReportDto>> GetStockSummaryAsync(InventoryReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<StockLedgerReportDto>> GetStockLedgerAsync(InventoryReportQuery query, CancellationToken cancellationToken);
    Task<PagedResult<ItemMovementReportDto>> GetItemMovementAsync(InventoryReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<LowStockReportDto>> GetLowStockAsync(LowStockReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<StockValuationReportDto>> GetStockValuationAsync(InventoryReportQuery query, CancellationToken cancellationToken);

    Task<PagedResult<PartyLedgerReportDto>> GetPartyLedgerAsync(PartyReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PartyStatementReportDto>> GetCustomerStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PartyStatementReportDto>> GetSupplierStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ReceivableAgingReportDto>> GetReceivableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PayableAgingReportDto>> GetPayableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken);
}
