using Cosmos.Contracts.Common;
using Cosmos.Contracts.Reports;
using Cosmos.Shared.Responses;

namespace Cosmos.Application.Abstractions.Services;

public interface IReportsService
{
    Task<ApiResponse<SalesSummaryReportDto>> GetSalesSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<SalesInvoiceRegisterReportDto>>> GetSalesInvoiceRegisterAsync(SalesInvoiceRegisterReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<SalesByPartyReportDto>>> GetSalesByPartyAsync(SalesByPartyReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<SalesByItemReportDto>>> GetSalesByItemAsync(SalesByItemReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<PaymentInReportDto>>> GetPaymentInAsync(PaymentInReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<CustomerReceivableReportDto>>> GetCustomerReceivablesAsync(CustomerReceivablesReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<SalesTaxSummaryReportDto>>> GetSalesTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);

    Task<ApiResponse<PurchaseSummaryReportDto>> GetPurchaseSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<PurchaseBillRegisterReportDto>>> GetPurchaseBillRegisterAsync(PurchaseBillRegisterReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PurchaseBySupplierReportDto>>> GetPurchaseBySupplierAsync(PurchaseBySupplierReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PurchaseByItemReportDto>>> GetPurchaseByItemAsync(PurchaseByItemReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<PaymentOutReportDto>>> GetPaymentOutAsync(PaymentOutReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<SupplierPayableReportDto>>> GetSupplierPayablesAsync(SupplierPayablesReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PurchaseTaxSummaryReportDto>>> GetPurchaseTaxSummaryAsync(ReportDateRangeQuery query, CancellationToken cancellationToken);

    Task<ApiResponse<ExpenseSummaryReportDto>> GetExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<ExpenseByCategoryReportDto>>> GetExpenseByCategoryAsync(ExpenseReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<ExpenseByPartyReportDto>>> GetExpenseByPartyAsync(ExpenseReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<MonthlyExpenseSummaryReportDto>>> GetMonthlyExpenseSummaryAsync(ExpenseReportQuery query, CancellationToken cancellationToken);

    Task<ApiResponse<IReadOnlyCollection<StockSummaryReportDto>>> GetStockSummaryAsync(InventoryReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<StockLedgerReportDto>>> GetStockLedgerAsync(InventoryReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<ItemMovementReportDto>>> GetItemMovementAsync(InventoryReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<LowStockReportDto>>> GetLowStockAsync(LowStockReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<StockValuationReportDto>>> GetStockValuationAsync(InventoryReportQuery query, CancellationToken cancellationToken);

    Task<ApiResponse<PagedResult<PartyLedgerReportDto>>> GetPartyLedgerAsync(PartyReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>> GetCustomerStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PartyStatementReportDto>>> GetSupplierStatementAsync(PartyStatementReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<ReceivableAgingReportDto>>> GetReceivableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyCollection<PayableAgingReportDto>>> GetPayableAgingAsync(AgingReportQuery query, CancellationToken cancellationToken);
}
