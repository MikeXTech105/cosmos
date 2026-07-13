import {
  SALES_INVOICE_STATUS,
  SALES_PAYMENT_MODE,
  SALES_PAYMENT_STATUS,
} from "../pages/sales/invoices/invoiceHelpers";
import {
  PAYMENT_MODE,
  PURCHASE_STATUS,
} from "../pages/purchase/purchaseHelpers";

export const REPORT_STATUS = {
  purchaseDocument: PURCHASE_STATUS,
  salesInvoice: SALES_INVOICE_STATUS,
};

export const REPORT_PAYMENT_STATUS = SALES_PAYMENT_STATUS;

export const REPORT_STATUS_OPTIONS = {
  purchaseDocument: [
    { label: "Draft", value: PURCHASE_STATUS.DRAFT },
    { label: "Confirmed", value: PURCHASE_STATUS.CONFIRMED },
    { label: "Cancelled", value: PURCHASE_STATUS.CANCELLED },
    { label: "Converted", value: PURCHASE_STATUS.CONVERTED },
  ],
  salesInvoice: [
    { label: "Draft", value: SALES_INVOICE_STATUS.DRAFT },
    { label: "Confirmed", value: SALES_INVOICE_STATUS.CONFIRMED },
    { label: "Cancelled", value: SALES_INVOICE_STATUS.CANCELLED },
  ],
};

export const REPORT_PAYMENT_STATUS_OPTIONS = [
  { label: "Unpaid", value: SALES_PAYMENT_STATUS.UNPAID },
  { label: "Partial", value: SALES_PAYMENT_STATUS.PARTIAL },
  { label: "Paid", value: SALES_PAYMENT_STATUS.PAID },
];

export const REPORT_PAYMENT_MODE_OPTIONS = [
  { label: "Cash", value: SALES_PAYMENT_MODE.CASH },
  { label: "Bank Transfer", value: SALES_PAYMENT_MODE.BANK_TRANSFER },
  { label: "UPI", value: SALES_PAYMENT_MODE.UPI },
  { label: "Card", value: SALES_PAYMENT_MODE.CARD },
  { label: "Cheque", value: SALES_PAYMENT_MODE.CHEQUE },
  { label: "Other", value: SALES_PAYMENT_MODE.OTHER },
];

export const REPORT_PURCHASE_PAYMENT_MODE_OPTIONS = [
  { label: "Cash", value: PAYMENT_MODE.CASH },
  { label: "Bank Transfer", value: PAYMENT_MODE.BANK_TRANSFER },
  { label: "UPI", value: PAYMENT_MODE.UPI },
  { label: "Card", value: PAYMENT_MODE.CARD },
  { label: "Cheque", value: PAYMENT_MODE.CHEQUE },
  { label: "Other", value: PAYMENT_MODE.OTHER },
];

const STATUS_TONES = {
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  converted: "bg-sky-50 text-sky-700 ring-sky-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partial: "bg-sky-50 text-sky-700 ring-sky-200",
  unpaid: "bg-red-50 text-red-700 ring-red-200",
};

export const toReportPillMap = (options = []) => {
  return Object.fromEntries(
    options.map((option) => {
      const toneKey = String(option.label).toLowerCase();

      return [
        option.value,
        {
          className:
            STATUS_TONES[toneKey] ?? "bg-slate-50 text-slate-600 ring-slate-200",
          label: option.label,
        },
      ];
    }),
  );
};

export const REPORT_STATUS_PILL_MAP = {
  purchaseDocument: toReportPillMap(REPORT_STATUS_OPTIONS.purchaseDocument),
  salesInvoice: toReportPillMap(REPORT_STATUS_OPTIONS.salesInvoice),
};

export const REPORT_PAYMENT_STATUS_PILL_MAP = toReportPillMap(
  REPORT_PAYMENT_STATUS_OPTIONS,
);

export const REPORT_PAYMENT_MODE_MAP = toReportPillMap(
  REPORT_PAYMENT_MODE_OPTIONS,
);

export const REPORT_PURCHASE_PAYMENT_MODE_MAP = toReportPillMap(
  REPORT_PURCHASE_PAYMENT_MODE_OPTIONS,
);
