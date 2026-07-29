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
import {
  EMPTY_VALUE,
  formatDate,
  formatDateTime,
  formatNumber,
} from "../../utils/format";

export const formatDispatchNumber = (
  value,
  fallback = EMPTY_VALUE,
  maximumFractionDigits = 2,
) => {
  const formatted = formatNumber(value, maximumFractionDigits);
  return formatted === EMPTY_VALUE ? fallback : formatted;
};

export const formatDispatchDate = (value, fallback = EMPTY_VALUE) => {
  const formatted = formatDate(value);
  return formatted === EMPTY_VALUE ? fallback : formatted;
};

export const formatDispatchDateTime = (value, fallback = EMPTY_VALUE) => {
  const formatted = formatDateTime(value);
  return formatted === EMPTY_VALUE ? fallback : formatted;
};

const getLabel = (labels, value, prefix) => {
  const numericLabel = labels[Number(value)];
  if (numericLabel) return numericLabel;

  const normalized = String(value ?? "").trim().toLowerCase();
  const textLabel = Object.values(labels).find(
    (label) => label.toLowerCase() === normalized,
  );

  return textLabel ?? (value ? `${prefix} ${value}` : "Unknown");
};

export const getDispatchImportTypeLabel = (value) =>
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
