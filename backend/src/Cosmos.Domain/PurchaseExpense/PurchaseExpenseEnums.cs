namespace Cosmos.Domain.PurchaseExpense;

public enum PurchaseDocumentStatus { Draft = 1, Confirmed = 2, PartiallyPaid = 3, Paid = 4, Cancelled = 5 }
public enum PurchaseOrderStatus { Draft = 1, Sent = 2, PartiallyConverted = 3, Converted = 4, Cancelled = 5 }
public enum PurchasePaymentStatus { Unpaid = 1, Partial = 2, Paid = 3 }
public enum PurchasePaymentMode { Cash = 1, Bank = 2, Upi = 3, Cheque = 4, Card = 5 }

