import { getApiErrorMessage } from "../../../utils/apiError";

export const SALES_INVOICE_STATUS = {
  DRAFT: 1,
  CONFIRMED: 2,
  PARTIALLY_PAID: 3,
  PAID: 4,
  CANCELLED: 5,
};

export const SALES_PAYMENT_STATUS = {
  UNPAID: 1,
  PARTIALLY_PAID: 2,
  PAID: 3,
};

export const SALES_PAYMENT_MODE = {
  CASH: 1,
  BANK_TRANSFER: 2,
  CARD: 3,
  UPI: 4,
  CHEQUE: 5,
  OTHER: 99,
};

export const INVOICE_STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: SALES_INVOICE_STATUS.DRAFT, label: "Draft" },
  { value: SALES_INVOICE_STATUS.CONFIRMED, label: "Confirmed" },
  { value: SALES_INVOICE_STATUS.PARTIALLY_PAID, label: "Partially paid" },
  { value: SALES_INVOICE_STATUS.PAID, label: "Paid" },
  { value: SALES_INVOICE_STATUS.CANCELLED, label: "Cancelled" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: SALES_PAYMENT_STATUS.UNPAID, label: "Unpaid" },
  { value: SALES_PAYMENT_STATUS.PARTIALLY_PAID, label: "Partially paid" },
  { value: SALES_PAYMENT_STATUS.PAID, label: "Paid" },
];

export const PAYMENT_MODE_OPTIONS = [
  { value: SALES_PAYMENT_MODE.CASH, label: "Cash" },
  { value: SALES_PAYMENT_MODE.BANK_TRANSFER, label: "Bank Transfer" },
  { value: SALES_PAYMENT_MODE.UPI, label: "UPI" },
  { value: SALES_PAYMENT_MODE.CARD, label: "Card" },
  { value: SALES_PAYMENT_MODE.CHEQUE, label: "Cheque" },
  { value: SALES_PAYMENT_MODE.OTHER, label: "Other" },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

const STATUS_META = {
  [SALES_INVOICE_STATUS.DRAFT]: {
    label: "Draft",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  [SALES_INVOICE_STATUS.CONFIRMED]: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  [SALES_INVOICE_STATUS.PARTIALLY_PAID]: {
    label: "Partially paid",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  [SALES_INVOICE_STATUS.PAID]: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  [SALES_INVOICE_STATUS.CANCELLED]: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

const PAYMENT_META = {
  [SALES_PAYMENT_STATUS.UNPAID]: {
    label: "Unpaid",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
  [SALES_PAYMENT_STATUS.PARTIALLY_PAID]: {
    label: "Partially paid",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  [SALES_PAYMENT_STATUS.PAID]: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

export const toNumber = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const toPositiveNumber = (value, fallback = 1) => {
  const numericValue = toNumber(value);

  return numericValue > 0 ? numericValue : fallback;
};

export const cleanNullableString = (value) => {
  const stringValue = String(value ?? "").trim();

  return stringValue || null;
};

export const normalizeNumberInput = (rawValue) => {
  const value = String(rawValue ?? "").replace(/[^\d.]/g, "");

  if (!value) {
    return "";
  }

  const decimalIndex = value.indexOf(".");

  if (decimalIndex >= 0) {
    const integerPart =
      value.slice(0, decimalIndex).replace(/^0+(?=\d)/, "") || "0";
    const decimalPart = value.slice(decimalIndex + 1).replace(/\./g, "");

    return `${integerPart}.${decimalPart}`;
  }

  return value.replace(/^0+(?=\d)/, "") || "0";
};

export const normalizeNumberBlurValue = (value, fallback = "0") => {
  const normalized = normalizeNumberInput(value);

  if (!normalized) {
    return fallback;
  }

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numericValue = Number(completedValue);

  return Number.isFinite(numericValue) ? String(numericValue) : fallback;
};

export const getTodayInputValue = () => {
  return new Date().toISOString().slice(0, 10);
};

export const addDaysToInputDate = (dateValue, days) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(date.getTime())) {
    return getTodayInputValue();
  }

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};

export const toInputDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

export const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

export const getInvoiceStatusMeta = (status) => {
  return (
    STATUS_META[Number(status)] ?? {
      label: `Status ${status ?? "-"}`,
      className: "bg-slate-50 text-slate-600 ring-slate-200",
    }
  );
};

export const getPaymentStatusMeta = (status) => {
  return (
    PAYMENT_META[Number(status)] ?? {
      label: `Payment ${status ?? "-"}`,
      className: "bg-slate-50 text-slate-600 ring-slate-200",
    }
  );
};

export const getPaymentModeLabel = (mode) => {
  return (
    PAYMENT_MODE_OPTIONS.find((option) => Number(option.value) === Number(mode))
      ?.label ?? `Mode ${mode ?? "-"}`
  );
};

export const isInvoiceDraft = (invoice) => {
  return Number(invoice?.status) === SALES_INVOICE_STATUS.DRAFT;
};

export const isInvoiceConfirmed = (invoice) => {
  return Number(invoice?.status) === SALES_INVOICE_STATUS.CONFIRMED;
};

export const isInvoiceCancelled = (invoice) => {
  return Number(invoice?.status) === SALES_INVOICE_STATUS.CANCELLED;
};

export const isInvoiceOverdue = (invoice) => {
  if (!invoice?.dueDate || toNumber(invoice?.dueAmount) <= 0) {
    return false;
  }

  const today = new Date(getTodayInputValue());
  const dueDate = new Date(invoice.dueDate);

  return !Number.isNaN(dueDate.getTime()) && dueDate < today;
};

export const buildInvoiceQueryParams = ({ filters, pageNumber, pageSize }) => {
  return {
    Search: filters.Search?.trim() || undefined,
    CustomerPartyId:
      filters.CustomerPartyId === "all" ? undefined : filters.CustomerPartyId,
    Status: filters.Status === "all" ? undefined : Number(filters.Status),
    PaymentStatus:
      filters.PaymentStatus === "all"
        ? undefined
        : Number(filters.PaymentStatus),
    FromDate: filters.FromDate || undefined,
    ToDate: filters.ToDate || undefined,
    PageNumber: pageNumber,
    PageSize: pageSize,
    SortBy: filters.SortBy || undefined,
    SortDirection: filters.SortDirection || undefined,
  };
};

export const getLineCalculations = (line) => {
  const quantity = toNumber(line?.quantity);
  const rate = toNumber(line?.rate);
  const baseAmount = quantity * rate;
  const percentageDiscount =
    baseAmount * (toNumber(line?.discountPercentage) / 100);
  const discountAmount =
    percentageDiscount + toNumber(line?.discountAmount);
  const taxableAmount = Math.max(0, baseAmount - discountAmount);
  const taxAmount = taxableAmount * (toNumber(line?.taxPercentage) / 100);
  const lineTotal = taxableAmount + taxAmount;

  return {
    baseAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
};

export const getInvoiceTotals = (items = [], invoiceDiscountAmount = 0) => {
  const lineTotals = items.map(getLineCalculations);
  const subTotal = lineTotals.reduce(
    (total, line) => total + line.baseAmount,
    0,
  );
  const lineDiscount = lineTotals.reduce(
    (total, line) => total + line.discountAmount,
    0,
  );
  const taxAmount = lineTotals.reduce(
    (total, line) => total + line.taxAmount,
    0,
  );
  const discountAmount = lineDiscount + toNumber(invoiceDiscountAmount);
  const grandTotal = Math.max(
    0,
    lineTotals.reduce((total, line) => total + line.lineTotal, 0) -
      toNumber(invoiceDiscountAmount),
  );

  return {
    subTotal,
    discountAmount,
    lineDiscount,
    invoiceDiscountAmount: toNumber(invoiceDiscountAmount),
    taxAmount,
    grandTotal,
  };
};

export const getDefaultInvoiceLine = () => ({
  itemId: "",
  itemName: "",
  hsnSacCode: "",
  hsnSource: "",
  quantity: "1",
  rate: "0",
  discountPercentage: "0",
  discountAmount: "0",
  taxRateId: null,
  taxPercentage: "0",
});

export const getInvoiceDefaultValues = (invoice) => {
  const today = getTodayInputValue();

  return {
    customerPartyId: invoice?.customerPartyId ?? "",
    companyGstRegistrationId: invoice?.companyGstRegistrationId ?? null,
    placeOfSupplyStateCode: invoice?.placeOfSupplyStateCode ?? "",
    placeOfSupplySource: invoice?.placeOfSupplySource ?? "",
    priceBasis: invoice?.priceBasis ?? "",
    invoiceNumber: invoice?.invoiceNumber ?? "",
    invoiceDate: toInputDate(invoice?.invoiceDate) || today,
    dueDate: toInputDate(invoice?.dueDate) || addDaysToInputDate(today, 15),
    discountAmount:
      invoice?.discountAmount === undefined ||
      invoice?.discountAmount === null
        ? "0"
        : String(invoice.discountAmount),
    notes: invoice?.notes ?? "",
    termsAndConditions:
      invoice?.termsAndConditions ??
      "Payment due as per invoice terms. Goods once sold will not be taken back.",
    initialPayment: {
      paymentDate: today,
      amount: "",
      paymentMode: SALES_PAYMENT_MODE.CASH,
      referenceNumber: "",
      notes: "",
    },
    items:
      Array.isArray(invoice?.items) && invoice.items.length > 0
        ? invoice.items.map((item) => ({
            itemId: item.itemId ?? "",
            itemName: item.itemNameSnapshot ?? item.itemName ?? "",
            hsnSacCode: item.hsnSacCodeSnapshot ?? item.hsnCode ?? "",
            hsnSource: item.hsnSource ?? "",
            quantity: String(item.quantity ?? 1),
            rate: String(item.rate ?? 0),
            discountPercentage: String(item.discountPercentage ?? 0),
            discountAmount: String(item.discountAmount ?? 0),
            taxRateId: item.taxRateId ?? null,
            taxPercentage: String(
              item.taxPercentageSnapshot ?? item.taxPercentage ?? 0,
            ),
          }))
        : [getDefaultInvoiceLine()],
  };
};

export const buildInvoicePayload = (values) => {
  const payload = {
    customerPartyId: values.customerPartyId,
    companyGstRegistrationId: values.companyGstRegistrationId ? Math.trunc(toNumber(values.companyGstRegistrationId)) : null,
    placeOfSupplyStateCode: values.placeOfSupplyStateCode?.trim() || null,
    placeOfSupplySource: values.placeOfSupplySource?.trim() || null,
    priceBasis: values.priceBasis === "" || values.priceBasis === null || values.priceBasis === undefined ? null : Math.trunc(toNumber(values.priceBasis)),
    invoiceDate: values.invoiceDate,
    dueDate: values.dueDate || null,
    items: values.items.map((item) => ({
      itemId: Math.trunc(toNumber(item.itemId)),
      quantity: toPositiveNumber(item.quantity),
      rate: toNumber(item.rate),
      discountPercentage: toNumber(item.discountPercentage),
      discountAmount: toNumber(item.discountAmount),
      taxRateId: item.taxRateId ? Math.trunc(toNumber(item.taxRateId)) : null,
      taxPercentage: toNumber(item.taxPercentage),
    })),
    discountAmount: toNumber(values.discountAmount),
    notes: cleanNullableString(values.notes),
    termsAndConditions: cleanNullableString(values.termsAndConditions),
  };

  const initialPaymentAmount = toNumber(values.initialPayment?.amount);

  if (initialPaymentAmount > 0) {
    payload.initialPayment = {
      paymentDate:
        values.initialPayment?.paymentDate ||
        values.invoiceDate ||
        getTodayInputValue(),
      amount: initialPaymentAmount,
      paymentMode: Math.trunc(toNumber(values.initialPayment?.paymentMode)),
      referenceNumber: cleanNullableString(
        values.initialPayment?.referenceNumber,
      ),
      notes: cleanNullableString(values.initialPayment?.notes),
    };
  }

  return payload;
};

export const getActionError = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

export const getSuccessMessage = (response, fallback) => {
  return response?.message || fallback;
};

export const getCustomerName = (customer) => {
  return (
    customer?.partyName ??
    customer?.tradeName ??
    customer?.legalName ??
    customer?.customerName ??
    "Customer"
  );
};

export const buildTaxBreakup = (items = []) => {
  const taxMap = new Map();

  items.forEach((item) => {
    const taxRate = toNumber(item.taxPercentageSnapshot ?? item.taxPercentage);
    const taxableAmount =
      toNumber(item.quantity) * toNumber(item.rate) -
      toNumber(item.discountAmount) -
      toNumber(item.quantity) *
        toNumber(item.rate) *
        (toNumber(item.discountPercentage) / 100);
    const taxAmount = toNumber(item.taxAmount);
    const current = taxMap.get(taxRate) ?? {
      rate: taxRate,
      taxableAmount: 0,
      taxAmount: 0,
    };

    current.taxableAmount += Math.max(0, taxableAmount);
    current.taxAmount += taxAmount;
    taxMap.set(taxRate, current);
  });

  return Array.from(taxMap.values()).sort((first, second) => {
    return first.rate - second.rate;
  });
};

const SMALL_NUMBERS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const convertHundreds = (value) => {
  const number = Math.trunc(value);
  const words = [];

  if (number >= 100) {
    words.push(`${SMALL_NUMBERS[Math.trunc(number / 100)]} Hundred`);
  }

  const remainder = number % 100;

  if (remainder > 0 && remainder < 20) {
    words.push(SMALL_NUMBERS[remainder]);
  } else if (remainder >= 20) {
    words.push(TENS[Math.trunc(remainder / 10)]);
    if (remainder % 10 > 0) {
      words.push(SMALL_NUMBERS[remainder % 10]);
    }
  }

  return words.join(" ");
};

export const amountToWords = (amount) => {
  const roundedAmount = Math.round(toNumber(amount));

  if (roundedAmount <= 0) {
    return "Rupees Zero Only";
  }

  const crore = Math.trunc(roundedAmount / 10000000);
  const lakh = Math.trunc((roundedAmount % 10000000) / 100000);
  const thousand = Math.trunc((roundedAmount % 100000) / 1000);
  const hundred = roundedAmount % 1000;
  const chunks = [
    [crore, "Crore"],
    [lakh, "Lakh"],
    [thousand, "Thousand"],
    [hundred, ""],
  ];
  const words = chunks
    .filter(([value]) => value > 0)
    .map(([value, suffix]) =>
      [convertHundreds(value), suffix].filter(Boolean).join(" "),
    )
    .join(" ");

  return `Rupees ${words} Only`;
};

export const buildTemplateInvoice = (invoice, customer = null) => {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const normalizedItems = items.map((item, index) => ({
    id: item.id ?? `${item.itemId}-${index}`,
    serial: index + 1,
    itemId: item.itemId,
    name: item.itemNameSnapshot ?? item.itemName ?? `Item ${index + 1}`,
    hsn: item.hsnSacCodeSnapshot ?? item.hsnCode ?? "",
    unit: item.unitNameSnapshot ?? item.unitName ?? "",
    quantity: toNumber(item.quantity),
    rate: toNumber(item.rate),
    taxableAmount: Math.max(0, toNumber(item.quantity) * toNumber(item.rate) *
      (1 - toNumber(item.discountPercentage) / 100) - toNumber(item.discountAmount)),
    discountPercentage: toNumber(item.discountPercentage),
    discountAmount: toNumber(item.discountAmount),
    taxPercentage: toNumber(
      item.taxPercentageSnapshot ?? item.taxPercentage,
    ),
    taxAmount: toNumber(item.taxAmount),
    lineTotal: toNumber(item.lineTotal),
  }));
  const totalAmount = toNumber(invoice?.grandTotal ?? invoice?.totalAmount);

  return {
    id: invoice?.id,
    invoiceNumber: invoice?.invoiceNumber ?? `INV-${invoice?.id ?? "DRAFT"}`,
    invoiceDate: invoice?.invoiceDate,
    dueDate: invoice?.dueDate,
    documentTitle: invoice?.documentTitle,
    eWayBillNumber: invoice?.eWayBillNumber,
    placeOfSupply: invoice?.placeOfSupply,
    purchaseOrderNumber: invoice?.purchaseOrderNumber,
    numberOfBoxes: invoice?.numberOfBoxes,
    purposeOfTransfer: invoice?.purposeOfTransfer,
    irn: invoice?.irn,
    shipTo: customer?.shippingAddressLine1 ? {
      name: invoice?.customerName ?? getCustomerName(customer),
      address: [customer.shippingAddressLine1, customer.shippingAddressLine2,
        customer.shippingCity, customer.shippingState, customer.shippingPincode].filter(Boolean).join(", "),
      gstin: customer.gstin ?? "",
    } : null,
    status: invoice?.status,
    statusLabel: getInvoiceStatusMeta(invoice?.status).label,
    paymentStatus: invoice?.paymentStatus,
    paymentStatusLabel: getPaymentStatusMeta(invoice?.paymentStatus).label,
    customer: {
      id: invoice?.customerPartyId,
      name:
        invoice?.customerName ??
        getCustomerName(customer) ??
        "Customer",
      mobile: invoice?.customerMobileNo ?? customer?.mobileNo ?? "",
      email: customer?.email ?? "",
      gstin: customer?.gstin ?? "",
      address: [
        customer?.billingAddressLine1,
        customer?.billingAddressLine2,
        customer?.billingCity,
        customer?.billingState,
        customer?.billingPincode,
      ]
        .filter(Boolean)
        .join(", "),
    },
    subTotal: toNumber(invoice?.subTotal),
    discountAmount: toNumber(invoice?.discountAmount),
    taxAmount: toNumber(invoice?.taxAmount),
    grandTotal: totalAmount,
    paidAmount: toNumber(invoice?.paidAmount),
    dueAmount: toNumber(invoice?.dueAmount ?? invoice?.balanceAmount),
    amountInWords: amountToWords(totalAmount),
    notes: invoice?.notes ?? "",
    termsAndConditions: invoice?.termsAndConditions ?? "",
    items: normalizedItems,
    taxBreakup: buildTaxBreakup(
      items.map((item, index) => ({
        ...item,
        taxPercentage: normalizedItems[index]?.taxPercentage,
      })),
    ),
  };
};
