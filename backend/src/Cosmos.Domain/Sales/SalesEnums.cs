namespace Cosmos.Domain.Sales;

public enum SalesInvoiceStatus
{
    Draft = 1,
    Confirmed = 2,
    PartiallyPaid = 3,
    Paid = 4,
    Cancelled = 5
}

public enum SalesPaymentStatus
{
    Unpaid = 1,
    PartiallyPaid = 2,
    Paid = 3
}

public enum SalesPaymentMode
{
    Cash = 1,
    BankTransfer = 2,
    Card = 3,
    Upi = 4,
    Cheque = 5,
    Other = 99
}

public enum StockMovementType
{
    SalesIssue = 1,
    SalesCancelReturn = 2
}
