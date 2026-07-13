import {
  REPORT_PAYMENT_MODE_MAP,
  REPORT_PAYMENT_STATUS_PILL_MAP,
  REPORT_STATUS_PILL_MAP,
} from "../../../constants/reportEnums";

const amountColumns = [
  { align: "right", format: "currency", header: "Taxable", key: "taxableAmount" },
  { align: "right", format: "currency", header: "Tax", key: "taxAmount" },
  { align: "right", format: "currency", header: "Total", key: "totalAmount" },
];

export const salesInvoiceColumns = [
  { header: "Invoice No", key: "invoiceNumber", width: "150px" },
  { format: "date", header: "Date", key: "invoiceDate", width: "130px" },
  { header: "Customer", key: "customerName", width: "220px" },
  {
    format: "pill",
    header: "Status",
    key: "status",
    pillMap: REPORT_STATUS_PILL_MAP.salesInvoice,
    width: "130px",
  },
  {
    format: "pill",
    header: "Payment",
    key: "paymentStatus",
    pillMap: REPORT_PAYMENT_STATUS_PILL_MAP,
    width: "130px",
  },
  ...amountColumns,
  { align: "right", format: "currency", header: "Paid", key: "paidAmount" },
  { align: "right", format: "currency", header: "Balance", key: "balanceAmount" },
];

export const salesByPartyColumns = [
  { header: "Party", key: "partyName", width: "240px" },
  { align: "right", format: "number", header: "Invoices", key: "invoiceCount" },
  ...amountColumns,
  { align: "right", format: "currency", header: "Paid", key: "paidAmount" },
  { align: "right", format: "currency", header: "Balance", key: "balanceAmount" },
];

export const salesByItemColumns = [
  { header: "Item", key: "itemName", width: "260px" },
  { header: "HSN/SAC", key: "hsnSacCode" },
  { align: "right", format: "qty", header: "Qty", key: "quantity" },
  ...amountColumns,
];

export const salesPaymentInColumns = [
  { header: "Invoice No", key: "invoiceNumber", width: "150px" },
  { format: "date", header: "Payment Date", key: "paymentDate", width: "140px" },
  { header: "Customer", key: "customerName", width: "220px" },
  { align: "right", format: "currency", header: "Amount", key: "amount" },
  {
    format: "enum",
    header: "Mode",
    key: "paymentMode",
    pillMap: REPORT_PAYMENT_MODE_MAP,
  },
  { header: "Reference", key: "referenceNumber" },
  { header: "Notes", key: "notes", sortable: false, width: "240px" },
];

export const salesReceivableColumns = [
  { header: "Party", key: "partyName", width: "260px" },
  { align: "right", format: "currency", header: "Total Sales", key: "totalSales" },
  { align: "right", format: "currency", header: "Paid", key: "paidAmount" },
  { align: "right", format: "currency", header: "Balance", key: "balanceAmount" },
];

export const salesTaxSummaryColumns = [
  { header: "HSN/SAC", key: "hsnSacCode" },
  { align: "right", format: "percent", header: "GST Rate", key: "gstRate" },
  { align: "right", format: "currency", header: "Taxable", key: "taxableAmount" },
  { align: "right", format: "currency", header: "Tax", key: "taxAmount" },
  { align: "right", format: "currency", header: "Total", key: "totalAmount" },
];
