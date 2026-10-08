import {
  REPORT_PAYMENT_STATUS_OPTIONS,
  REPORT_PURCHASE_PAYMENT_STATUS_OPTIONS,
  REPORT_STATUS_OPTIONS,
} from "../../../constants/reportEnums";
import {
  ROJMEL_TRANSACTION_STATUS_LABELS,
  ROJMEL_TRANSACTION_TYPE_LABELS,
} from "../../../constants/rojmelEnums";

export const REPORT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_REPORT_PAGE_SIZE = 20;
export const MAX_REPORT_PAGE_SIZE = 200;
export const REPORT_TOP_OPTIONS = [5, 10, 20, 50];

export const REPORT_ROJMEL_TRANSACTION_TYPE_OPTIONS = Object.entries(
  ROJMEL_TRANSACTION_TYPE_LABELS,
).map(([value, label]) => ({ label, value: Number(value) }));

export const REPORT_ROJMEL_STATUS_OPTIONS = Object.entries(
  ROJMEL_TRANSACTION_STATUS_LABELS,
).map(([value, label]) => ({ label, value: Number(value) }));

export const REPORT_INVENTORY_MOVEMENT_TYPE_OPTIONS = [
  { label: "In", value: "In" },
  { label: "Out", value: "Out" },
  { label: "Adjustment", value: "Adjustment" },
  { label: "Transfer", value: "Transfer" },
];

export const REPORT_INVENTORY_SOURCE_TYPE_OPTIONS = [
  { label: "Purchase", value: "Purchase" },
  { label: "Sale", value: "Sale" },
  { label: "Adjustment", value: "Adjustment" },
  { label: "Opening", value: "Opening" },
];

export const REPORT_INVENTORY_STOCK_STATUS_OPTIONS = [
  { label: "In Stock", value: "InStock" },
  { label: "Low", value: "Low" },
  { label: "Out of Stock", value: "OutOfStock" },
  { label: "Negative", value: "Negative" },
];

const pad = (value) => String(value).padStart(2, "0");

const toInputDate = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfQuarter = (date) => {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
};

const startOfFinancialYear = (date) => {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;

  return new Date(year, 3, 1);
};

const startOfWeek = (date) => {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  nextDate.setDate(nextDate.getDate() + offset);

  return nextDate;
};

export const DATE_PRESETS = [
  {
    getRange: (today) => ({ from: today, to: today }),
    label: "Today",
    value: "today",
  },
  {
    getRange: (today) => ({ from: startOfWeek(today), to: today }),
    label: "This Week",
    value: "thisWeek",
  },
  {
    getRange: (today) => ({ from: startOfMonth(today), to: today }),
    label: "This Month",
    value: "thisMonth",
  },
  {
    getRange: (today) => ({ from: startOfQuarter(today), to: today }),
    label: "This Quarter",
    value: "thisQuarter",
  },
  {
    getRange: (today) => ({ from: startOfFinancialYear(today), to: today }),
    label: "This FY",
    value: "thisFy",
  },
  {
    getRange: () => ({ from: "", to: "" }),
    label: "Custom",
    value: "custom",
  },
];

export const filterRegistry = {
  asOfDate: {
    label: "As of date",
    param: "AsOfDate",
  },
  category: {
    label: "Category",
    param: "CategoryId",
  },
  dateRange: {
    params: ["FromDate", "ToDate"],
  },
  includeInactive: {
    label: "Include inactive",
    param: "IncludeInactive",
    type: "boolean",
  },
  inactiveDays: {
    label: "Inactive days",
    param: "InactiveDays",
    type: "number",
  },
  item: {
    label: "Item",
    param: "ItemId",
  },
  lowStockOnly: {
    param: "LowStockOnly",
  },
  minimumStockValue: {
    label: "Minimum stock value",
    param: "MinimumStockValue",
    type: "number",
  },
  minimumTransactions: {
    label: "Minimum transactions",
    param: "MinimumTransactions",
    type: "number",
  },
  movementType: {
    label: "movement type",
    options: REPORT_INVENTORY_MOVEMENT_TYPE_OPTIONS,
    param: "MovementType",
  },
  party: {
    label: "Party",
    param: "PartyId",
  },
  rojmelWallet: {
    label: "Wallet",
    param: "WalletId",
  },
  rojmelCategory: {
    label: "Category",
    param: "CategoryId",
  },
  rojmelTransactionType: {
    label: "Transaction type",
    options: REPORT_ROJMEL_TRANSACTION_TYPE_OPTIONS,
    param: "TransactionType",
  },
  rojmelStatus: {
    label: "Status",
    options: REPORT_ROJMEL_STATUS_OPTIONS,
    param: "Status",
  },
  paymentStatus: {
    options: REPORT_PAYMENT_STATUS_OPTIONS,
    param: "PaymentStatus",
  },
  purchasePaymentStatus: {
    options: REPORT_PURCHASE_PAYMENT_STATUS_OPTIONS,
    param: "PaymentStatus",
  },
  search: {
    param: "Search",
  },
  sourceType: {
    label: "source type",
    options: REPORT_INVENTORY_SOURCE_TYPE_OPTIONS,
    param: "SourceType",
  },
  status: {
    getOptions: (config = {}) =>
      REPORT_STATUS_OPTIONS[config.statusType] ?? REPORT_STATUS_OPTIONS.salesInvoice,
    param: "Status",
  },
  stockStatus: {
    label: "stock status",
    options: REPORT_INVENTORY_STOCK_STATUS_OPTIONS,
    param: "StockStatus",
  },
  top: {
    label: "limit",
    options: REPORT_TOP_OPTIONS,
    param: "Top",
  },
  unit: {
    label: "Unit",
    param: "UnitId",
  },
};

export const normalizeFilterConfig = (filter) => {
  return typeof filter === "string" ? { key: filter } : filter;
};

export const getFilterParamName = (filter) => {
  const config = normalizeFilterConfig(filter);
  const definition = filterRegistry[config.key];

  return config.param ?? definition?.param ?? config.key;
};

export const reportHasFilter = (report, filterKey) => {
  return (report.filters ?? []).some((filter) => {
    return normalizeFilterConfig(filter).key === filterKey;
  });
};

export const getDatePresetRange = (presetValue) => {
  const preset =
    DATE_PRESETS.find((entry) => entry.value === presetValue) ??
    DATE_PRESETS.find((entry) => entry.value === "thisMonth");
  const today = new Date();
  const range = preset.getRange(today);

  return {
    FromDate: range.from ? toInputDate(range.from) : "",
    ToDate: range.to ? toInputDate(range.to) : "",
  };
};

const clampPageSize = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_REPORT_PAGE_SIZE;
  }

  return Math.min(Math.trunc(numericValue), MAX_REPORT_PAGE_SIZE);
};

const normalizePageNumber = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.trunc(numericValue)
    : 1;
};

export const getDefaultReportFilters = (report) => {
  const defaults = {
    PageNumber: 1,
    PageSize: DEFAULT_REPORT_PAGE_SIZE,
    SortBy: report.defaultSort?.by ?? "",
    SortDirection: report.defaultSort?.dir ?? "",
  };

  (report.filters ?? []).forEach((filter) => {
    const config = normalizeFilterConfig(filter);
    const definition = filterRegistry[config.key];
    const param = getFilterParamName(config);

    if (config.key === "dateRange") {
      Object.assign(defaults, {
        datePreset: "thisMonth",
        ...getDatePresetRange("thisMonth"),
      });
      return;
    }

    if (config.key === "search") {
      defaults.Search = "";
      return;
    }

    if (config.key === "lowStockOnly" || definition?.type === "boolean") {
      defaults[param] = false;
      return;
    }

    defaults[param] = "all";
  });

  return defaults;
};

export const getReportFiltersFromSearchParams = (report, searchParams) => {
  const defaults = getDefaultReportFilters(report);
  const filters = { ...defaults };

  Object.keys(defaults).forEach((key) => {
    if (!searchParams.has(key)) {
      return;
    }

    const value = searchParams.get(key);

    if (key === "PageNumber") {
      filters[key] = normalizePageNumber(value);
    } else if (key === "PageSize") {
      filters[key] = clampPageSize(value);
    } else if (typeof defaults[key] === "boolean") {
      filters[key] = value === "true";
    } else {
      filters[key] = value ?? defaults[key];
    }
  });

  return filters;
};

export const buildReportSearchParams = (report, filters) => {
  const defaults = getDefaultReportFilters(report);
  const searchParams = new URLSearchParams();

  Object.entries({ ...defaults, ...filters }).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (value === "all" || value === false) {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
};

export const buildReportParams = (report, filters) => {
  const params = {};

  (report.filters ?? []).forEach((filter) => {
    const config = normalizeFilterConfig(filter);
    const definition = filterRegistry[config.key];
    const param = getFilterParamName(config);

    if (config.key === "dateRange") {
      params.FromDate = filters.FromDate || undefined;
      params.ToDate = filters.ToDate || undefined;
      return;
    }

    if (config.key === "search") {
      params.Search = filters.Search?.trim() || undefined;
      return;
    }

    if (config.key === "lowStockOnly" || definition?.type === "boolean") {
      params[param] = filters[param] ? true : undefined;
      return;
    }

    params[param] =
      filters[param] === "all" || filters[param] === ""
        ? undefined
        : filters[param];
  });

  if (report.paginated) {
    params.PageNumber = normalizePageNumber(filters.PageNumber);
    params.PageSize = clampPageSize(filters.PageSize);
    params.SortBy = filters.SortBy || undefined;
    params.SortDirection = filters.SortDirection || undefined;
  }

  return params;
};

export const hasActiveReportFilters = (report, filters) => {
  const defaults = getDefaultReportFilters(report);

  return (report.filters ?? []).some((filter) => {
    const config = normalizeFilterConfig(filter);

    if (config.key === "dateRange") {
      return (
        filters.FromDate !== defaults.FromDate ||
        filters.ToDate !== defaults.ToDate ||
        filters.datePreset !== defaults.datePreset
      );
    }

    if (config.key === "search") {
      return Boolean(filters.Search);
    }

    const param = getFilterParamName(config);

    return filters[param] !== defaults[param];
  });
};
