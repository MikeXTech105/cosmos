import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../utils/inventoryQuery";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatDate,
  formatDateInput,
  formatNumber,
  formatPercent,
} from "../../utils/format";

export const OEE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const OEE_STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const OEE_HORIZON_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 15, label: "Last 15 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export const OEE_RATING_BANDS = [
  {
    label: "Critical",
    min: 0,
    max: 40,
    tone: "red",
    color: "var(--color-red-500)",
    bgClass: "bg-red-50 text-red-700 ring-red-200",
  },
  {
    label: "Needs Attention",
    min: 40,
    max: 65,
    tone: "amber",
    color: "var(--color-amber-500)",
    bgClass: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  {
    label: "Good",
    min: 65,
    max: 85,
    tone: "yellow",
    color: "var(--color-yellow-500)",
    bgClass: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  },
  {
    label: "World-Class",
    min: 85,
    max: 100,
    tone: "emerald",
    color: "var(--color-green-500)",
    bgClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
];

export const OEE_RATING_FILTER_OPTIONS = [
  { value: "all", label: "All ratings" },
  ...OEE_RATING_BANDS.slice()
    .reverse()
    .map((band) => ({ value: band.label, label: band.label })),
];

export const buildOeeListQueryParams = ({
  filters,
  pageNumber,
  pageSize,
  extra = {},
}) => ({
  Search: filters.Search?.trim() || undefined,
  IsActive:
    filters.IsActive === "all" ? undefined : filters.IsActive === "active",
  Page: pageNumber,
  PageSize: clampInventoryPageSize(pageSize, DEFAULT_INVENTORY_PAGE_SIZE),
  SortBy: filters.SortBy || undefined,
  SortDirection: filters.SortDirection || undefined,
  ...extra,
});

export const buildOeeProductionQueryParams = ({
  filters,
  pageNumber,
  pageSize,
}) => ({
  FromDate: filters.FromDate || undefined,
  ToDate: filters.ToDate || undefined,
  MachineId: filters.MachineId || undefined,
  MouldId: filters.MouldId || undefined,
  DowntimeReasonId: filters.DowntimeReasonId || undefined,
  Page: pageNumber,
  PageSize: clampInventoryPageSize(pageSize, DEFAULT_INVENTORY_PAGE_SIZE),
  SortBy: filters.SortBy || undefined,
  SortDirection: filters.SortDirection || undefined,
});

export const buildOeeRangeParams = (filters = {}) => {
  if (filters.mode === "custom") {
    return {
      FromDate: filters.FromDate || undefined,
      ToDate: filters.ToDate || undefined,
    };
  }

  return {
    LastDays: filters.LastDays || 30,
  };
};

export const buildOeeReportParams = (filters = {}) => ({
  ...buildOeeRangeParams(filters),
  MachineId: filters.MachineId || undefined,
  MouldId: filters.MouldId || undefined,
  DowntimeReasonId: filters.DowntimeReasonId || undefined,
});

export const extractOeeEntity = (payload, key) => {
  return payload?.[key] ?? payload?.item ?? payload?.record ?? payload;
};

export const getOeeRecordId = (record, resource) => {
  const idKey = resource ? `${resource}Id` : null;

  return (
    record?.id ??
    (idKey ? record?.[idKey] : undefined) ??
    record?.machineId ??
    record?.mouldId ??
    record?.downtimeReasonId ??
    record?.productionEntryId ??
    record?._id
  );
};

export const getOeeBoolean = (value, fallback = true) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return ["active", "true", "1", "yes"].includes(
      value.trim().toLowerCase(),
    );
  }

  return Boolean(value);
};

export const formatOeeNumber = (value, options = {}) => {
  return formatNumber(value, {
    maxFractionDigits: options.maximumFractionDigits ?? 2,
    minFractionDigits: options.minimumFractionDigits ?? 0,
  });
};

export const formatOeePercent = (value, digits = 1) => {
  return formatPercent(value, digits);
};

export const formatOeeDate = (value) => {
  return formatDate(value);
};

export const getTodayInputValue = () => formatDateInput(new Date());

export const getDateDaysAgoInputValue = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return formatDateInput(date);
};

export const getOeeActionError = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

export const getOeeSuccessMessage = (response, fallback) => {
  return response?.message || fallback;
};

export const normalizeOeeNumberInput = (rawValue, allowDecimal = true) => {
  const allowedPattern = allowDecimal ? /[^\d.]/g : /[^\d]/g;
  const value = String(rawValue ?? "").replace(allowedPattern, "");

  if (!value) {
    return "";
  }

  if (!allowDecimal) {
    return value.replace(/^0+(?=\d)/, "") || "0";
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

export const normalizeOeeNumberBlurValue = (
  value,
  allowDecimal = true,
) => {
  const normalized = normalizeOeeNumberInput(value, allowDecimal);

  if (!normalized) {
    return "0";
  }

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numericValue = Number(completedValue);

  return Number.isFinite(numericValue) ? String(numericValue) : "0";
};

export const getOeeRating = (value) => {
  const percentage = Number(value);
  const safePercentage = Number.isFinite(percentage) ? percentage : 0;
  const matchedBand = OEE_RATING_BANDS.slice()
    .reverse()
    .find((band) => safePercentage >= band.min);

  return matchedBand ?? OEE_RATING_BANDS[0];
};
