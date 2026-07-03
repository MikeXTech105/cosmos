namespace Cosmos.Application.Sales;

public sealed record CreateSalesInvoiceCommand(
    Guid CustomerPartyId,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    IReadOnlyCollection<SalesInvoiceItemRequest> Items,
    decimal DiscountAmount,
    string? Notes,
    string? TermsAndConditions,
    AddSalesPaymentCommand? InitialPayment = null);

public sealed record UpdateSalesInvoiceCommand(
    Guid CustomerPartyId,
    DateOnly InvoiceDate,
    DateOnly? DueDate,
    IReadOnlyCollection<SalesInvoiceItemRequest> Items,
    decimal DiscountAmount,
    string? Notes,
    string? TermsAndConditions);

public sealed record SalesInvoiceItemRequest(
    long ItemId,
    decimal Quantity,
    decimal Rate,
    decimal DiscountPercentage,
    decimal DiscountAmount,
    long? TaxRateId = null,
    decimal TaxPercentage = 0);

public sealed record AddSalesPaymentCommand(
    DateOnly PaymentDate,
    decimal Amount,
    int PaymentMode,
    string? ReferenceNumber,
    string? Notes);

public sealed record GetSalesInvoicesQuery(
    string? Search = null,
    Guid? CustomerPartyId = null,
    int? Status = null,
    int? PaymentStatus = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    int PageNumber = 1,
    int PageSize = 20,
    string? SortBy = "InvoiceDate",
    string? SortDirection = "DESC");

public sealed record GetSalesInvoiceByIdQuery(long Id);
public sealed record GetSalesPaymentsQuery(long SalesInvoiceId);

public sealed record GetSalesSummaryReportQuery(DateOnly? FromDate = null, DateOnly? ToDate = null);
public sealed record GetCustomerReceivablesQuery(Guid? CustomerPartyId = null);
public sealed record GetItemWiseSalesReportQuery(DateOnly? FromDate = null, DateOnly? ToDate = null, long? ItemId = null);
