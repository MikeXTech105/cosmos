import {
  RojmelTransactionStatus,
  RojmelTransactionType,
  RojmelWalletType,
} from "../../constants/rojmelEnums";
import {
  clampRojmelPageSize,
  DEFAULT_ROJMEL_PAGE_SIZE,
} from "../../utils/rojmelQuery";

const pad = (value) => String(value).padStart(2, "0");

export const toRojmelInputDate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getRojmelMonthRange = (today = new Date()) => ({
  FromDate: toRojmelInputDate(
    new Date(today.getFullYear(), today.getMonth(), 1),
  ),
  ToDate: toRojmelInputDate(today),
});

export const formatRojmelCurrency = (value, fallback = "₹0.00") => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(numericValue);
};

export const formatRojmelDate = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const PAYMENT_MODE_OPTIONS = ["Cash", "UPI", "Bank", "Card", "Other"].map(
  (value) => ({ label: value, value }),
);

export const ROJMEL_TRANSACTION_TYPE_OPTIONS = [
  { label: "All types", value: "all" },
  { label: "Income", value: RojmelTransactionType.Income },
  { label: "Expense", value: RojmelTransactionType.Expense },
  { label: "Transfer In", value: RojmelTransactionType.TransferIn },
  { label: "Transfer Out", value: RojmelTransactionType.TransferOut },
  { label: "Adjustment In", value: RojmelTransactionType.AdjustmentIn },
  { label: "Opening Balance", value: RojmelTransactionType.OpeningBalance },
  { label: "Adjustment Out", value: RojmelTransactionType.AdjustmentOut },
];

export const ROJMEL_STATUS_OPTIONS = [
  { label: "All status", value: "all" },
  { label: "Posted", value: RojmelTransactionStatus.Posted },
  { label: "Cancelled", value: RojmelTransactionStatus.Cancelled },
];

export const ROJMEL_WALLET_TYPE_OPTIONS = [
  { label: "All wallet types", value: "all" },
  { label: "Company", value: RojmelWalletType.Company },
  { label: "User", value: RojmelWalletType.User },
  { label: "External", value: RojmelWalletType.External },
  { label: "Bank Cash", value: RojmelWalletType.BankCash },
  { label: "Petty Cash", value: RojmelWalletType.PettyCash },
];

export const ROJMEL_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200].map(
  (value) => ({ label: String(value), value }),
);

const cleanFilterValue = (value) =>
  value === "all" || value === "" || value === null ? undefined : value;

export const buildRojmelQuery = ({ filters, pageNumber, pageSize }) => ({
  ...Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      key === "Search"
        ? value?.trim() || undefined
        : cleanFilterValue(value),
    ]),
  ),
  PageNumber: Number(pageNumber) || 1,
  PageSize: clampRojmelPageSize(pageSize, DEFAULT_ROJMEL_PAGE_SIZE),
});

export const getRojmelCollection = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
};

export const getRojmelSuccessMessage = (response, fallback) =>
  response?.message || fallback;
