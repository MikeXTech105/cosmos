import {
  getApiCorrelationId,
  getApiErrorMessage,
} from "../../utils/apiError";
import { decimalText, quantityText } from "../../utils/productionValues";

export const formatShipmentNumber = (value, fallback = "—") => {
  if (value == null || value === "") return fallback;
  try { decimalText(value); return quantityText(value, { scale: 6 }); } catch { return fallback; }
};

export const formatShipmentCurrency = (value, currency = "INR") => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return "—";

  const normalizedCurrency = /^[A-Z]{3}$/.test(String(currency ?? ""))
    ? String(currency)
    : "INR";

  try {
    return new Intl.NumberFormat("en-IN", {
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
      style: "currency",
    }).format(numeric);
  } catch {
    return `${normalizedCurrency} ${numeric.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
};

export const formatShipmentDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export const formatShipmentDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export const getShipmentItems = (response) =>
  Array.isArray(response?.data?.items) ? response.data.items : [];

export const getShipmentMutationMessage = (error, fallback) => {
  const message = getApiErrorMessage(error, fallback);
  const correlationId = getApiCorrelationId(error);

  return correlationId && !message.includes(correlationId)
    ? `${message} Ref: ${correlationId}`
    : message;
};
