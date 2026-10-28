import { websiteUtcDate } from "../../utils/websiteTime";

export const formatWebsiteDateTime = (value, timeZone) => {
  if (!value) return "—";
  const date = websiteUtcDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
};

export const formatWebsiteDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
};

export const formatWebsiteMoney = (value, currency = "INR") => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      currency: currency || "INR",
      style: "currency",
    }).format(amount);
  } catch {
    return `${currency || "INR"} ${amount.toLocaleString("en-IN")}`;
  }
};
