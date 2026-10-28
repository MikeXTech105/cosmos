import { PlanningMessageSeverity } from "../../constants/procurementEnums";
import { quantityText } from "../../utils/productionValues";
import {
  getApiErrorList,
  getApiErrorMessage,
  getApiFieldErrors,
  getApiStatus,
} from "../../utils/apiError";

const EMPTY_VALUE = "-";

export const toIsoDate = (date) => {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getDefaultProcurementRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);

  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
};

export const getInclusiveDayCount = (fromDate, toDate) => {
  if (!fromDate || !toDate) {
    return 0;
  }

  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  const difference = to - from;

  if (!Number.isFinite(difference) || difference < 0) {
    return 0;
  }

  return Math.floor(difference / 86400000) + 1;
};

export const validateDateRange = (fromDate, toDate, maxDays) => {
  if (!fromDate || !toDate) {
    return "Choose both a start and end date.";
  }

  const days = getInclusiveDayCount(fromDate, toDate);

  if (days === 0) {
    return "The end date must be on or after the start date.";
  }

  if (maxDays && days > maxDays) {
    return `Choose a range of ${maxDays} days or fewer.`;
  }

  return "";
};

export const toNumberOrNull = (value) => {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const formatProcurementDecimal = (
  value,
  fallback = EMPTY_VALUE,
  options = {},
) => {
  const hasOptionsAsFallback =
    fallback !== null && typeof fallback === "object" && !Array.isArray(fallback);
  const resolvedFallback = hasOptionsAsFallback ? EMPTY_VALUE : fallback;
  const resolvedOptions = hasOptionsAsFallback ? fallback : options;
  const requestedMaximum = Number(resolvedOptions?.maxFractionDigits);
  const maximumFractionDigits = Number.isFinite(requestedMaximum)
    ? Math.min(6, Math.max(0, Math.trunc(requestedMaximum)))
    : 2;
  const number = toNumberOrNull(value);

  return number === null
    ? resolvedFallback
    : number.toLocaleString("en-IN", {
        maximumFractionDigits,
        minimumFractionDigits: 0,
        useGrouping: true,
      });
};

export const formatProcurementQuantity = (value, fallback = EMPTY_VALUE) => {
  if (value === null || value === undefined || value === "") return fallback;
  const formatted = quantityText(value, { scale: 6 });
  return formatted === "Invalid quantity" ? fallback : formatted;
};

export const formatProcurementInteger = (value, fallback = EMPTY_VALUE) => {
  const number = toNumberOrNull(value);

  return number === null
    ? fallback
    : number.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export const formatProcurementDate = (value, fallback = EMPTY_VALUE) => {
  if (!value) {
    return fallback;
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

export const formatProcurementDateTime = (value, fallback = EMPTY_VALUE) => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getCollection = (payload, keys = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    ...keys,
    "items",
    "rows",
    "records",
    "results",
    "lines",
  ];

  for (const key of candidates) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

export const getPagination = (payload, itemCount = 0) => ({
  pageNumber: Number(payload?.pageNumber) || 1,
  pageSize: Number(payload?.pageSize) || 20,
  totalCount: Number(payload?.totalCount) || itemCount,
  totalPages: Math.max(1, Number(payload?.totalPages) || 1),
});

export const getRecordId = (record, keys = []) => {
  for (const key of [
    "id",
    ...keys,
    "itemId",
    "salesChannelId",
    "skuMappingId",
    "importBatchId",
    "planningRunId",
    "planningLineId",
  ]) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return record[key];
    }
  }

  return null;
};

export const getItemCode = (item) =>
  item?.itemCode ?? item?.code ?? item?.sku ?? "";

export const getItemName = (item) =>
  item?.itemName ?? item?.name ?? item?.productName ?? "";

export const getItemLabel = (item) => {
  const code = getItemCode(item);
  const name = getItemName(item);

  return [code, name].filter(Boolean).join(" - ") || "Unnamed item";
};

export const getChannelLabel = (channel) =>
  [channel?.channelCode ?? channel?.code, channel?.channelName ?? channel?.name]
    .filter(Boolean)
    .join(" - ") || "Unnamed channel";

export const getProcurementBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "active", "manual"].includes(
      value.toLowerCase(),
    );
  }

  return Boolean(value);
};

export { getApiStatus };

export const getProcurementError = (error, fallback) =>
  getApiErrorMessage(error, fallback);

export const getFieldErrorMap = getApiFieldErrors;

export const getErrorDetails = (error) => getApiErrorList(error);

export const getMessageSeverity = (message) => {
  const value = message?.severity ?? message?.messageSeverity;

  if (typeof value === "number") {
    return value;
  }

  const text = String(value ?? message?.type ?? "").toLowerCase();

  if (text.includes("block") || text.includes("error")) {
    return PlanningMessageSeverity.BlockingError;
  }
  if (text.includes("warn")) {
    return PlanningMessageSeverity.Warning;
  }

  return PlanningMessageSeverity.Information;
};

export const getPlanningMessages = (payload) => {
  const direct = getCollection(payload, ["messages", "validationMessages"]);

  if (direct.length > 0) {
    return direct;
  }

  return [
    ...getCollection(payload?.blockingErrors),
    ...getCollection(payload?.warnings),
    ...getCollection(payload?.information),
  ];
};

export const getPlanningFixRoute = (message) => {
  const code = String(message?.code ?? message?.messageCode ?? "").toUpperCase();

  if (code.includes("BOM")) {
    return "/procurement/setup?tab=bom";
  }
  if (code.includes("SKU") || code.includes("UNMAPPED")) {
    return "/procurement/setup?tab=sku";
  }
  if (code.includes("SETTING") || code.includes("LEAD_TIME")) {
    return "/procurement/setup?tab=settings";
  }

  return null;
};

export const isManualSalesRow = (row) => {
  const source = String(
    row?.source ?? row?.entryType ?? row?.salesSource ?? "",
  ).toLowerCase();

  return row?.isManual === true || source.includes("manual");
};

export const hasDecimalPrecision = (value, maximum = 6) => {
  if (value === "" || value === undefined || value === null) {
    return true;
  }

  const text = String(value).trim();
  const precision = Math.max(0, Math.trunc(Number(maximum) || 0));
  const pattern = new RegExp(
    `^[+-]?(?:\\d+(?:\\.\\d{0,${precision}})?|\\.\\d{1,${precision}})$`,
  );

  return pattern.test(text) && Number.isFinite(Number(text));
};

export const PROCUREMENT_PAGE_SIZE_OPTIONS = [20, 50, 100, 200];
export const INVENTORY_BASIS_MESSAGE =
  "Planning uses global Items.CurrentStock plus the latest valid inbound snapshot. This is not warehouse-level allocation.";
