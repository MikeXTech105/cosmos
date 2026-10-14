import {
  DISPATCH_IMPORT_STATUS_LABELS,
  DISPATCH_IMPORT_TYPE_LABELS,
  DISPATCH_ROUNDING_MODE_LABELS,
  DISPATCH_RUN_STATUS_LABELS,
  DISPATCH_TIER_LABELS,
} from "../../constants/dispatchEnums";
import {
  getApiCorrelationId,
  getApiErrorMessage,
} from "../../utils/apiError";

const DISPATCH_IMPORT_TYPE_DATABASE_LABELS = Object.freeze({
  DispatchWarehouseSales: "Sales",
  DispatchWarehouseStock: "Warehouse stock",
  DispatchWarehouseInbound: "Inbound",
});

export const formatDispatchNumber = (
  value,
  fallback = "—",
  maximumFractionDigits = 2,
) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", { maximumFractionDigits })
    : fallback;
};

export const formatDispatchDate = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export const formatDispatchDateTime = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getLabel = (labels, value, prefix) => {
  const directLabel = labels[value] ?? labels[Number(value)];
  if (directLabel) return directLabel;

  const normalized = String(value ?? "").trim().toLowerCase();
  const textLabel = Object.values(labels).find(
    (label) => label.toLowerCase() === normalized,
  );

  return textLabel ?? (value ? `${prefix} ${value}` : "Unknown");
};

export const getDispatchImportTypeLabel = (value) =>
  DISPATCH_IMPORT_TYPE_DATABASE_LABELS[value] ??
  getLabel(DISPATCH_IMPORT_TYPE_LABELS, value, "Type");
export const getDispatchImportStatusLabel = (value) =>
  getLabel(DISPATCH_IMPORT_STATUS_LABELS, value, "Status");
export const getDispatchRunStatusLabel = (value) =>
  getLabel(DISPATCH_RUN_STATUS_LABELS, value, "Status");
export const getDispatchTierLabel = (value) =>
  getLabel(DISPATCH_TIER_LABELS, value, "Tier");
export const getDispatchRoundingLabel = (value) =>
  getLabel(DISPATCH_ROUNDING_MODE_LABELS, value, "Mode");

export const getDispatchError = (error, fallback) => {
  const message = getApiErrorMessage(error, fallback);
  const correlationId = getApiCorrelationId(error);

  return correlationId && !message.includes(correlationId)
    ? `${message}\nReference: ${correlationId}`
    : message;
};
