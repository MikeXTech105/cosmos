namespace Cosmos.Application.PurchaseExpense;

public sealed record PurchaseLineRequest(long ItemId, decimal Quantity, decimal PurchasePrice, decimal DiscountPercentage = 0, decimal DiscountAmount = 0, decimal TaxPercentage = 0, long? UnitId = null, long? PurchaseBillItemId = null);
public sealed record CreatePurchaseBillRequest(Guid SupplierId, string? SupplierInvoiceNo, DateOnly BillDate, DateOnly? DueDate, int PaymentType, IReadOnlyCollection<PurchaseLineRequest> Items, decimal DiscountAmount = 0, decimal RoundOff = 0, decimal PaidAmount = 0, string? Notes = null);
public sealed record UpdatePurchaseBillRequest(Guid SupplierId, string? SupplierInvoiceNo, DateOnly BillDate, DateOnly? DueDate, int PaymentType, IReadOnlyCollection<PurchaseLineRequest> Items, decimal DiscountAmount = 0, decimal RoundOff = 0, decimal PaidAmount = 0, string? Notes = null);
public sealed record PurchaseBillListQuery(string? Search = null, Guid? SupplierId = null, int? Status = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 20, string SortBy = "BillDate", string SortDirection = "DESC");

public sealed record SupplierPaymentAllocationRequest(long PurchaseBillId, decimal AllocatedAmount);
public sealed record CreateSupplierPaymentRequest(Guid SupplierId, DateOnly PaymentDate, decimal Amount, int PaymentMode, string? ReferenceNo = null, string? Notes = null, IReadOnlyCollection<SupplierPaymentAllocationRequest>? Allocations = null);
public sealed record UpdateSupplierPaymentRequest(Guid SupplierId, DateOnly PaymentDate, decimal Amount, int PaymentMode, string? ReferenceNo = null, string? Notes = null, IReadOnlyCollection<SupplierPaymentAllocationRequest>? Allocations = null);
public sealed record SupplierPaymentListQuery(string? Search = null, Guid? SupplierId = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 20, string SortBy = "PaymentDate", string SortDirection = "DESC");

public sealed record CreateExpenseCategoryRequest(string Name, string? Description = null, bool IsActive = true);
public sealed record UpdateExpenseCategoryRequest(string Name, string? Description = null, bool IsActive = true);
public sealed record ExpenseCategoryListQuery(string? Search = null, bool? IsActive = null, int PageNumber = 1, int PageSize = 20, string SortBy = "Name", string SortDirection = "ASC");
public sealed record CreateExpenseRequest(DateOnly ExpenseDate, long CategoryId, Guid? PaidToPartyId, decimal Amount, decimal TaxAmount, int PaymentMode, string? ReferenceNo = null, string? Notes = null, string? AttachmentPath = null);
public sealed record UpdateExpenseRequest(DateOnly ExpenseDate, long CategoryId, Guid? PaidToPartyId, decimal Amount, decimal TaxAmount, int PaymentMode, string? ReferenceNo = null, string? Notes = null, string? AttachmentPath = null);
public sealed record ExpenseListQuery(string? Search = null, long? CategoryId = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 20, string SortBy = "ExpenseDate", string SortDirection = "DESC");

public sealed record CreatePurchaseOrderRequest(Guid SupplierId, DateOnly OrderDate, DateOnly? ExpectedDeliveryDate, IReadOnlyCollection<PurchaseLineRequest> Items, decimal DiscountAmount = 0, string? TermsAndConditions = null, string? Notes = null);
public sealed record UpdatePurchaseOrderRequest(Guid SupplierId, DateOnly OrderDate, DateOnly? ExpectedDeliveryDate, IReadOnlyCollection<PurchaseLineRequest> Items, decimal DiscountAmount = 0, string? TermsAndConditions = null, string? Notes = null);
public sealed record PurchaseOrderListQuery(string? Search = null, Guid? SupplierId = null, int? Status = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 20, string SortBy = "OrderDate", string SortDirection = "DESC");
public sealed record ConvertPurchaseOrderRequest(DateOnly BillDate, DateOnly? DueDate = null, int PaymentType = 2, decimal PaidAmount = 0, string? SupplierInvoiceNo = null);

public sealed record CreatePurchaseReturnRequest(long? PurchaseBillId, Guid SupplierId, DateOnly ReturnDate, string? Reason, IReadOnlyCollection<PurchaseLineRequest> Items, string? Notes = null);
public sealed record UpdatePurchaseReturnRequest(long? PurchaseBillId, Guid SupplierId, DateOnly ReturnDate, string? Reason, IReadOnlyCollection<PurchaseLineRequest> Items, string? Notes = null);
public sealed record PurchaseReturnListQuery(string? Search = null, Guid? SupplierId = null, DateOnly? FromDate = null, DateOnly? ToDate = null, int PageNumber = 1, int PageSize = 20, string SortBy = "ReturnDate", string SortDirection = "DESC");

public sealed record DateRangeReportQuery(DateOnly? FromDate = null, DateOnly? ToDate = null);

