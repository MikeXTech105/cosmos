export const DASHBOARD_TOP_OPTIONS = [5, 10, 20];
export const DASHBOARD_PREVIEW_OPTIONS = [3, 5, 10];

export const COMPARISON_PERIODS = [
  { value: "PreviousPeriod", label: "Previous Period" },
  { value: "PreviousMonth", label: "Previous Month" },
  { value: "Yesterday", label: "Yesterday" },
];

export const GROUP_BY_OPTIONS = [
  { value: "Day", label: "Day" },
  { value: "Week", label: "Week" },
  { value: "Month", label: "Month" },
];

export const PARTY_TYPE_OPTIONS = [
  { value: "Customer", label: "Customers" },
  { value: "Supplier", label: "Suppliers" },
];

export const DASHBOARD_COMPARISON_OPTIONS = COMPARISON_PERIODS;
export const DASHBOARD_GROUP_BY_OPTIONS = GROUP_BY_OPTIONS;
export const DASHBOARD_PARTY_TYPE_OPTIONS = PARTY_TYPE_OPTIONS;

export const dashboardEmptyValue = "-";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});

const pad = (value) => String(value).padStart(2, "0");

export const toInputDate = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getTodayInputValue = () => toInputDate(new Date());

const startOfWeek = (date) => {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  nextDate.setDate(nextDate.getDate() + offset);

  return nextDate;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfQuarter = (date) => {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
};

const startOfFinancialYear = (date) => {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;

  return new Date(year, 3, 1);
};

export const DASHBOARD_DATE_PRESETS = [
  {
    getRange: (today) => ({ fromDate: today, toDate: today }),
    label: "Today",
    value: "today",
  },
  {
    getRange: (today) => ({ fromDate: startOfWeek(today), toDate: today }),
    label: "This Week",
    value: "thisWeek",
  },
  {
    getRange: (today) => ({ fromDate: startOfMonth(today), toDate: today }),
    label: "This Month",
    value: "thisMonth",
  },
  {
    getRange: (today) => ({ fromDate: startOfQuarter(today), toDate: today }),
    label: "This Quarter",
    value: "thisQuarter",
  },
  {
    getRange: (today) => ({ fromDate: startOfFinancialYear(today), toDate: today }),
    label: "This FY",
    value: "thisFy",
  },
  {
    getRange: () => ({ fromDate: "", toDate: "" }),
    label: "Custom",
    value: "custom",
  },
];

export const getDatePresetRange = (presetValue) => {
  const preset =
    DASHBOARD_DATE_PRESETS.find((entry) => entry.value === presetValue) ??
    DASHBOARD_DATE_PRESETS.find((entry) => entry.value === "thisMonth");
  const range = preset.getRange(new Date());

  return {
    fromDate: range.fromDate ? toInputDate(range.fromDate) : "",
    toDate: range.toDate ? toInputDate(range.toDate) : "",
  };
};

export const getDefaultDashboardFilters = () => ({
  attendanceDate: getTodayInputValue(),
  categoryId: "all",
  comparisonPeriod: COMPARISON_PERIODS[0].value,
  datePreset: "thisMonth",
  groupBy: GROUP_BY_OPTIONS[0].value,
  minimumAmount: "",
  partyType: PARTY_TYPE_OPTIONS[0].value,
  previewLimit: 5,
  top: 5,
  ...getDatePresetRange("thisMonth"),
});

export const clampDashboardTop = (value, fallback = 5) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.min(20, Math.trunc(numericValue));
};

export const clampDashboardPreviewLimit = (value, fallback = 5) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.min(20, Math.trunc(numericValue));
};

export const normalizeDashboardNumberInput = (rawValue) => {
  const value = String(rawValue ?? "").replace(/[^\d.]/g, "");

  if (!value) {
    return "";
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

const getOptionValues = (options) => {
  return new Set(options.map((option) => option.value));
};

const normalizeOptionValue = (value, options, fallback, legacyValues = {}) => {
  const optionValues = getOptionValues(options);

  if (optionValues.has(value)) {
    return value;
  }

  const normalizedValue = String(value ?? "").trim().toLowerCase();

  return legacyValues[normalizedValue] ?? fallback;
};

export const normalizeDashboardFilters = (filters = {}) => {
  const defaults = getDefaultDashboardFilters();
  const next = { ...defaults, ...filters };

  return {
    ...next,
    comparisonPeriod: normalizeOptionValue(
      next.comparisonPeriod,
      COMPARISON_PERIODS,
      defaults.comparisonPeriod,
      {
        "previous period": "PreviousPeriod",
        "previous-period": "PreviousPeriod",
        "previous month": "PreviousMonth",
        "previous-month": "PreviousMonth",
        yesterday: "Yesterday",
      },
    ),
    groupBy: normalizeOptionValue(next.groupBy, GROUP_BY_OPTIONS, defaults.groupBy, {
      day: "Day",
      month: "Month",
      week: "Week",
    }),
    partyType: normalizeOptionValue(
      next.partyType,
      PARTY_TYPE_OPTIONS,
      defaults.partyType,
      {
        all: "Customer",
        both: "Customer",
        customer: "Customer",
        customers: "Customer",
        supplier: "Supplier",
        suppliers: "Supplier",
      },
    ),
    previewLimit: clampDashboardPreviewLimit(next.previewLimit),
    top: clampDashboardTop(next.top),
  };
};

export const getDashboardFiltersFromSearchParams = (searchParams) => {
  const defaults = getDefaultDashboardFilters();
  const next = { ...defaults };

  Object.keys(defaults).forEach((key) => {
    if (!searchParams.has(key)) {
      return;
    }

    next[key] = searchParams.get(key) ?? defaults[key];
  });

  return normalizeDashboardFilters(next);
};

export const buildDashboardSearchParams = (filters) => {
  const defaults = getDefaultDashboardFilters();
  const params = new URLSearchParams();
  const normalized = normalizeDashboardFilters(filters);

  Object.entries(normalized).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (value === defaults[key]) {
      return;
    }

    params.set(key, String(value));
  });

  return params;
};

export const buildDashboardApiParams = {
  alerts: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      MinimumAmount: normalized.minimumAmount || undefined,
      PreviewLimit: clampDashboardPreviewLimit(normalized.previewLimit),
    };
  },
  hrSummary: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      AttendanceDate: normalized.attendanceDate || getTodayInputValue(),
    };
  },
  overview: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      ComparisonPeriod: normalized.comparisonPeriod,
      FromDate: normalized.fromDate || undefined,
      ToDate: normalized.toDate || undefined,
    };
  },
  recentActivity: () => ({ limit: 10 }),
  revenueExpenseTrend: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      FromDate: normalized.fromDate || undefined,
      GroupBy: normalized.groupBy,
      ToDate: normalized.toDate || undefined,
    };
  },
  salesPurchaseTrend: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      FromDate: normalized.fromDate || undefined,
      GroupBy: normalized.groupBy,
      ToDate: normalized.toDate || undefined,
    };
  },
  topParties: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      FromDate: normalized.fromDate || undefined,
      PartyType: normalized.partyType,
      ToDate: normalized.toDate || undefined,
      Top: clampDashboardTop(normalized.top),
    };
  },
  topSellingItems: (filters) => {
    const normalized = normalizeDashboardFilters(filters);

    return {
      CategoryId:
        normalized.categoryId === "all" ? undefined : normalized.categoryId,
      FromDate: normalized.fromDate || undefined,
      ToDate: normalized.toDate || undefined,
      Top: clampDashboardTop(normalized.top),
    };
  },
};

export const toDashboardNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
};

export const formatCurrency = (value) => {
  const numericValue = toDashboardNumber(value);

  return numericValue === null
    ? dashboardEmptyValue
    : currencyFormatter.format(numericValue);
};

export const formatCompactCurrency = (value) => {
  const numericValue = toDashboardNumber(value);

  if (numericValue === null) {
    return dashboardEmptyValue;
  }

  const absValue = Math.abs(numericValue);
  const sign = numericValue < 0 ? "-" : "";

  if (absValue >= 10000000) {
    return `${sign}₹${numberFormatter.format(absValue / 10000000)}Cr`;
  }

  if (absValue >= 100000) {
    return `${sign}₹${numberFormatter.format(absValue / 100000)}L`;
  }

  if (absValue >= 1000) {
    return `${sign}₹${numberFormatter.format(absValue / 1000)}K`;
  }

  return `${sign}₹${numberFormatter.format(absValue)}`;
};

export const formatNumber = (value) => {
  const numericValue = toDashboardNumber(value);

  return numericValue === null
    ? dashboardEmptyValue
    : numberFormatter.format(numericValue);
};

export const formatPercent = (value) => {
  const numericValue = toDashboardNumber(value);

  return numericValue === null
    ? dashboardEmptyValue
    : `${percentFormatter.format(numericValue)}%`;
};

export const formatDate = (value) => {
  if (!value) {
    return dashboardEmptyValue;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDashboardValue = (value, format = "number") => {
  if (format === "currency") {
    return formatCurrency(value);
  }

  if (format === "percent") {
    return formatPercent(value);
  }

  if (format === "date") {
    return formatDate(value);
  }

  return formatNumber(value);
};

const toPascalCaseKey = (key) => {
  const text = String(key ?? "");

  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
};

export const getDashboardValue = (row, key, fallback = dashboardEmptyValue) => {
  if (!row || !key) {
    return fallback;
  }

  const candidates = Array.isArray(key) ? key : [key];

  for (const candidate of candidates) {
    const path = String(candidate).split(".");
    let current = row;

    for (const segment of path) {
      current =
        current?.[segment] ??
        current?.[toPascalCaseKey(segment)] ??
        current?.[segment.toLowerCase()];
    }

    if (current !== null && current !== undefined && current !== "") {
      return current;
    }
  }

  return fallback;
};

export const isEmptyCollection = (value) => {
  return !Array.isArray(value) || value.length === 0;
};

export const getCssVariable = (name, fallback) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
};
