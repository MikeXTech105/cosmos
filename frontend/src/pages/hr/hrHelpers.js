import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../utils/inventoryQuery";
import { getApiErrorMessage } from "../../utils/apiError";
import { quantityText } from "../../utils/productionValues";

export const HR_STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const HR_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const buildHrQueryParams = ({
  filters,
  pageNumber,
  pageSize,
  extra = {},
}) => ({
  Search: filters.Search?.trim() || undefined,
  IsActive:
    filters.IsActive === "all" ? undefined : filters.IsActive === "active",
  PageNumber: pageNumber,
  PageSize: clampInventoryPageSize(pageSize, DEFAULT_INVENTORY_PAGE_SIZE),
  SortBy: filters.SortBy || undefined,
  SortDirection: filters.SortDirection || undefined,
  ...extra,
});

export const extractHrEntity = (payload, key) => {
  return payload?.[key] ?? payload?.item ?? payload?.record ?? payload;
};

export const getHrRecordId = (record, resource) => {
  const idKey = resource ? `${resource}Id` : null;

  return (
    record?.id ??
    (idKey ? record?.[idKey] : undefined) ??
    record?.departmentId ??
    record?.designationId ??
    record?.shiftId ??
    record?._id
  );
};

export const getHrBoolean = (value, fallback = true) => {
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

export const formatHrDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatHrTime = (value) => {
  if (!value) {
    return "-";
  }

  const normalized = String(value).slice(0, 5);

  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return String(value);
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatHrDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
};

export const formatHrCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "—";
  const text = quantityText(value, { scale: 2, group: false });
  if (text === "Invalid quantity") return "—";
  const [whole, fraction = ""] = text.split(".");
  const negative = whole.startsWith("-");
  const digits = whole.replace(/^-/, "");
  const grouped = digits.length > 3 ? `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${digits.slice(-3)}` : digits;
  return `${negative ? "-" : ""}₹${grouped}.${fraction.padEnd(2, "0")}`;
};

export const formatHrHours = (value) => {
  const hours = Number(value);

  if (!Number.isFinite(hours)) {
    return "-";
  }

  return `${hours.toFixed(hours % 1 === 0 ? 0 : 2)} hrs`;
};

export const combineDateAndTime = (date, time) => {
  if (!date || !time) {
    return null;
  }

  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
};

export const getHrActionError = (error, fallback) => {
  return getApiErrorMessage(error, fallback);
};

export const getHrSuccessMessage = (response, fallback) => {
  return response?.message || fallback;
};

export const getEmployeeName = (employee) => {
  const name = [employee?.firstName, employee?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    employee?.fullName ||
    employee?.employeeName ||
    employee?.name ||
    employee?.label ||
    "-"
  );
};

export const getEmployeeInitials = (employee) => {
  const name = getEmployeeName(employee);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HR";
};

export const getLookupLabel = (options, value, fallback = "-") => {
  const option = options.find((item) => String(item.value) === String(value));

  return option?.label ?? fallback;
};
