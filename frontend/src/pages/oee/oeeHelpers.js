import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../utils/inventoryQuery";
import { getApiErrorMessage } from "../../utils/apiError";

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
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  });
};

export const formatOeePercent = (value, digits = 1) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return `${number.toFixed(digits)}%`;
};

export const formatOeeDate = (value) => {
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

export const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

export const getDateDaysAgoInputValue = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return date.toISOString().slice(0, 10);
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

  if (percentage >= 85) {
    return {
      label: "World-Class",
      tone: "emerald",
      color: "#059669",
      bgClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
  }

  if (percentage >= 65) {
    return {
      label: "Good",
      tone: "brand",
      color: "var(--app-accent)",
      bgClass: "bg-brand-light text-brand ring-brand/20",
    };
  }

  if (percentage >= 40) {
    return {
      label: "Needs Attention",
      tone: "amber",
      color: "#d97706",
      bgClass: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "Critical",
    tone: "red",
    color: "#dc2626",
    bgClass: "bg-red-50 text-red-700 ring-red-200",
  };
};
