const EMPTY_VALUE = "-";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  style: "percent",
});

export const toReportNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
};

export const formatCurrency = (value) => {
  const numericValue = toReportNumber(value);

  return numericValue === null ? EMPTY_VALUE : currencyFormatter.format(numericValue);
};

export const formatNumber = (value) => {
  const numericValue = toReportNumber(value);

  return numericValue === null ? EMPTY_VALUE : numberFormatter.format(numericValue);
};

export const formatQty = (value) => {
  const numericValue = toReportNumber(value);

  return numericValue === null ? EMPTY_VALUE : quantityFormatter.format(numericValue);
};

export const formatDate = (value) => {
  if (!value) {
    return EMPTY_VALUE;
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

export const formatPercent = (value) => {
  const numericValue = toReportNumber(value);

  if (numericValue === null) {
    return EMPTY_VALUE;
  }

  return percentFormatter.format(
    Math.abs(numericValue) > 1 ? numericValue / 100 : numericValue,
  );
};

export const getNumericToneClassName = (value) => {
  const numericValue = toReportNumber(value);

  if (numericValue === null || numericValue === 0) {
    return "text-slate-400";
  }

  return numericValue < 0 ? "text-red-600" : "text-slate-900";
};

const toPascalCaseKey = (key) => {
  const text = String(key ?? "");

  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
};

export const getReportValue = (row, key, fallback = EMPTY_VALUE) => {
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

export const getPillMeta = (value, column = {}) => {
  const rawMap = column.pillMap ?? column.enumMap ?? {};
  const meta =
    rawMap[value] ??
    rawMap[String(value)] ??
    rawMap[Number(value)] ??
    null;

  if (meta) {
    return typeof meta === "string" ? { label: meta } : meta;
  }

  return {
    className: "bg-slate-50 text-slate-600 ring-slate-200",
    label: value === EMPTY_VALUE ? EMPTY_VALUE : String(value ?? EMPTY_VALUE),
  };
};

export const formatCell = (value, column = {}) => {
  if (column.renderText) {
    return column.renderText(value);
  }

  if (column.format === "currency") {
    return formatCurrency(value);
  }

  if (column.format === "date") {
    return formatDate(value);
  }

  if (column.format === "number") {
    return formatNumber(value);
  }

  if (column.format === "percent") {
    return formatPercent(value);
  }

  if (column.format === "qty" || column.format === "quantity") {
    return formatQty(value);
  }

  if (column.format === "pill" || column.format === "enum") {
    return getPillMeta(value, column).label;
  }

  return value === null || value === undefined || value === ""
    ? EMPTY_VALUE
    : String(value);
};

export const isNumericColumn = (column = {}) => {
  return ["currency", "number", "percent", "qty", "quantity"].includes(
    column.format,
  );
};

export const reportEmptyValue = EMPTY_VALUE;
