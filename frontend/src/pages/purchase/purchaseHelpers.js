import { getApiErrorMessage } from "../../utils/apiError";
import {
  EMPTY_VALUE,
  formatCurrency as formatDisplayCurrency,
  formatDate as formatDisplayDate,
  formatDateInput,
  formatNumber as formatDisplayNumber,
} from "../../utils/format";

export const PURCHASE_STATUS = {
  DRAFT: 0,
  CONFIRMED: 1,
  CANCELLED: 2,
  CONVERTED: 3,
};

export const PAYMENT_TYPE = {
  CREDIT: 0,
  CASH: 1,
  PARTIAL: 2,
};

export const PAYMENT_MODE = {
  CASH: 0,
  BANK_TRANSFER: 1,
  UPI: 2,
  CARD: 3,
  CHEQUE: 4,
  OTHER: 5,
};

export const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: PURCHASE_STATUS.DRAFT, label: "Draft" },
  { value: PURCHASE_STATUS.CONFIRMED, label: "Confirmed" },
  { value: PURCHASE_STATUS.CANCELLED, label: "Cancelled" },
  { value: PURCHASE_STATUS.CONVERTED, label: "Converted" },
];

export const ACTIVE_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const PAYMENT_TYPE_OPTIONS = [
  { value: PAYMENT_TYPE.CREDIT, label: "Credit" },
  { value: PAYMENT_TYPE.CASH, label: "Cash" },
  { value: PAYMENT_TYPE.PARTIAL, label: "Partial" },
];

export const PAYMENT_MODE_OPTIONS = [
  { value: PAYMENT_MODE.CASH, label: "Cash" },
  { value: PAYMENT_MODE.BANK_TRANSFER, label: "Bank Transfer" },
  { value: PAYMENT_MODE.UPI, label: "UPI" },
  { value: PAYMENT_MODE.CARD, label: "Card" },
  { value: PAYMENT_MODE.CHEQUE, label: "Cheque" },
  { value: PAYMENT_MODE.OTHER, label: "Other" },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

const STATUS_META = {
  [PURCHASE_STATUS.DRAFT]: {
    label: "Draft",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  [PURCHASE_STATUS.CONFIRMED]: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  [PURCHASE_STATUS.CANCELLED]: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
  [PURCHASE_STATUS.CONVERTED]: {
    label: "Converted",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
};

export const getStatusMeta = (status) => {
  return (
    STATUS_META[Number(status)] ?? {
      label: status === null || status === undefined ? "-" : `Status ${status}`,
      className: "bg-slate-50 text-slate-600 ring-slate-200",
    }
  );
};

export const getPaymentModeLabel = (mode) => {
  return (
    PAYMENT_MODE_OPTIONS.find((option) => Number(option.value) === Number(mode))
      ?.label ?? "-"
  );
};

export const getPaymentTypeLabel = (type) => {
  return (
    PAYMENT_TYPE_OPTIONS.find((option) => Number(option.value) === Number(type))
      ?.label ?? "-"
  );
};

export const toNumber = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
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

export const normalizeSignedNumberInput = (rawValue) => {
  const rawString = String(rawValue ?? "");
  const isNegative = rawString.trimStart().startsWith("-");
  const normalized = normalizeNumberInput(rawString);

  if (!normalized) {
    return isNegative ? "-" : "";
  }

  return isNegative && normalized !== "0" ? `-${normalized}` : normalized;
};

export const normalizeSignedNumberBlurValue = (value, fallback = "0") => {
  const normalized = normalizeSignedNumberInput(value);

  if (!normalized || normalized === "-") {
    return fallback;
  }

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numericValue = Number(completedValue);

  return Number.isFinite(numericValue) ? String(numericValue) : fallback;
};

export const getTodayInputValue = () => formatDateInput(new Date());

export const addDaysToInputDate = (dateValue, days) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(date.getTime())) {
    return getTodayInputValue();
  }

  date.setDate(date.getDate() + days);

  return formatDateInput(date);
};

export const toInputDate = (value) => {
  const formatted = formatDateInput(value);
  return formatted === EMPTY_VALUE ? "" : formatted;
};

export const formatDate = (value) => {
  return formatDisplayDate(value);
};

export const formatCurrency = (value) => {
  return formatDisplayCurrency(value);
};

export const formatNumber = (value) => {
  return formatDisplayNumber(value);
};

export const getActionError = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

export const getSuccessMessage = (response, fallback) => {
  return response?.message || fallback;
};

export const getRecordId = (record) => record?.id ?? record?.purchaseBillId;

export const getSupplierName = (record) => {
  return (
    record?.supplierName ??
    record?.partyName ??
    record?.supplier?.partyName ??
    record?.supplier?.name ??
    "Supplier"
  );
};

export const getCategoryName = (record) => {
  return record?.categoryName ?? record?.expenseCategoryName ?? record?.name ?? "-";
};

export const getDocumentNumber = (record, fallbackPrefix = "DOC") => {
  return (
    record?.billNo ??
    record?.billNumber ??
    record?.purchaseBillNo ??
    record?.orderNo ??
    record?.orderNumber ??
    record?.purchaseOrderNo ??
    record?.returnNo ??
    record?.returnNumber ??
    record?.paymentNo ??
    record?.paymentNumber ??
    record?.documentNo ??
    `${fallbackPrefix}-${record?.id ?? "DRAFT"}`
  );
};

export const getRecordTotal = (record) => {
  return toNumber(
    record?.grandTotal ??
      record?.totalAmount ??
      record?.netAmount ??
      record?.amount ??
      record?.total,
  );
};

export const getPaidAmount = (record) => toNumber(record?.paidAmount);

export const getBalanceAmount = (record) => {
  return toNumber(
    record?.balanceAmount ?? record?.dueAmount ?? record?.outstandingAmount,
  );
};

export const isActiveRecord = (record) => record?.isActive !== false;

export const buildListParams = ({
  filters,
  pageNumber,
  pageSize,
  type,
}) => {
  const params = {
    Search: filters.Search?.trim() || undefined,
    PageNumber: pageNumber,
    PageSize: pageSize,
    SortBy: filters.SortBy || undefined,
    SortDirection: filters.SortDirection || undefined,
  };

  if (Object.hasOwn(filters, "IsActive")) {
    params.IsActive =
      filters.IsActive === "all" ? undefined : filters.IsActive === "active";
  }

  if (Object.hasOwn(filters, "CategoryId")) {
    params.CategoryId =
      filters.CategoryId === "all" ? undefined : Number(filters.CategoryId);
  }

  if (Object.hasOwn(filters, "SupplierId")) {
    params.SupplierId =
      filters.SupplierId === "all" ? undefined : filters.SupplierId;
  }

  if (Object.hasOwn(filters, "Status")) {
    params.Status = filters.Status === "all" ? undefined : Number(filters.Status);
  }

  if (type !== "category") {
    params.FromDate = filters.FromDate || undefined;
    params.ToDate = filters.ToDate || undefined;
  }

  return params;
};

export const getDefaultLine = () => ({
  itemId: "",
  itemName: "",
  quantity: "1",
  purchasePrice: "0",
  discountPercentage: "0",
  discountAmount: "0",
  taxPercentage: "0",
  unitId: null,
  purchaseBillItemId: null,
});

export const normalizeLineFromRecord = (line) => ({
  itemId: line?.itemId ?? "",
  itemName:
    line?.itemName ??
    line?.itemNameSnapshot ??
    line?.name ??
    line?.item?.name ??
    "",
  quantity: String(line?.quantity ?? 1),
  purchasePrice: String(line?.purchasePrice ?? line?.rate ?? line?.unitPrice ?? 0),
  discountPercentage: String(line?.discountPercentage ?? 0),
  discountAmount: String(line?.discountAmount ?? 0),
  taxPercentage: String(
    line?.taxPercentage ?? line?.taxPercentageSnapshot ?? line?.gstRate ?? 0,
  ),
  unitId: line?.unitId ?? null,
  purchaseBillItemId: line?.purchaseBillItemId ?? line?.id ?? null,
});

export const getLineCalculations = (line) => {
  const quantity = toNumber(line?.quantity);
  const purchasePrice = toNumber(line?.purchasePrice);
  const baseAmount = quantity * purchasePrice;
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
    lineTotal,
    taxableAmount,
    taxAmount,
  };
};

export const getDocumentTotals = ({
  discountAmount = 0,
  items = [],
  paidAmount = 0,
  roundOff = 0,
}) => {
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
  const grandTotal = Math.max(
    0,
    lineTotals.reduce((total, line) => total + line.lineTotal, 0) -
      toNumber(discountAmount) +
      toNumber(roundOff),
  );

  return {
    balanceAmount: Math.max(0, grandTotal - toNumber(paidAmount)),
    grandTotal,
    lineDiscount,
    subTotal,
    taxAmount,
    totalDiscount: lineDiscount + toNumber(discountAmount),
  };
};

export const buildLinePayload = (items = []) => {
  return items.map((item) => ({
    itemId: Math.trunc(toNumber(item.itemId)),
    quantity: toNumber(item.quantity),
    purchasePrice: toNumber(item.purchasePrice),
    discountPercentage: toNumber(item.discountPercentage),
    discountAmount: toNumber(item.discountAmount),
    taxPercentage: toNumber(item.taxPercentage),
    unitId: item.unitId ? Math.trunc(toNumber(item.unitId)) : null,
    purchaseBillItemId: item.purchaseBillItemId
      ? Math.trunc(toNumber(item.purchaseBillItemId))
      : null,
  }));
};

export const extractItems = (record) => {
  const items =
    record?.items ??
    record?.lines ??
    record?.purchaseBillItems ??
    record?.purchaseOrderItems ??
    record?.purchaseReturnItems ??
    [];

  return Array.isArray(items) && items.length > 0
    ? items.map(normalizeLineFromRecord)
    : [getDefaultLine()];
};

export const getMonthStartInputValue = () => {
  const date = new Date();
  date.setDate(1);

  return formatDateInput(date);
};
