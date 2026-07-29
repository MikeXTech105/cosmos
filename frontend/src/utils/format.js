export const EMPTY_VALUE = "—";

const LOCALE = "en-IN";
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isEmpty = (value) =>
  value === null || value === undefined || value === "";

const toFiniteNumber = (value) => {
  if (isEmpty(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const dateFromParts = (year, month, day) => {
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
};

const toValidDate = (value) => {
  if (isEmpty(value)) {
    return null;
  }

  if (typeof value === "string") {
    const match = DATE_ONLY_PATTERN.exec(value.trim());

    if (match) {
      return dateFromParts(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      );
    }
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getNumberOptions = (decimalPlacesOrOptions = 2) => {
  if (
    decimalPlacesOrOptions !== null &&
    typeof decimalPlacesOrOptions === "object"
  ) {
    const requestedMaximum = Number(
      decimalPlacesOrOptions.maxFractionDigits ??
        decimalPlacesOrOptions.maximumFractionDigits,
    );
    const requestedMinimum = Number(
      decimalPlacesOrOptions.minFractionDigits ??
        decimalPlacesOrOptions.minimumFractionDigits,
    );
    const maximumFractionDigits = Number.isFinite(requestedMaximum)
      ? Math.min(20, Math.max(0, Math.trunc(requestedMaximum)))
      : 2;
    const minimumFractionDigits = Number.isFinite(requestedMinimum)
      ? Math.min(
          maximumFractionDigits,
          Math.max(0, Math.trunc(requestedMinimum)),
        )
      : 0;

    return {
      ...decimalPlacesOrOptions,
      maximumFractionDigits,
      minimumFractionDigits,
      useGrouping: decimalPlacesOrOptions.useGrouping !== false,
    };
  }

  const requestedPlaces = Number(decimalPlacesOrOptions);
  const maximumFractionDigits = Number.isFinite(requestedPlaces)
    ? Math.min(20, Math.max(0, Math.trunc(requestedPlaces)))
    : 2;

  return {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: true,
  };
};

export const formatDate = (value) => {
  const date = toValidDate(value);

  return date
    ? new Intl.DateTimeFormat(LOCALE, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    : EMPTY_VALUE;
};

export const formatDateTime = (value) => {
  const date = toValidDate(value);

  if (!date) {
    return EMPTY_VALUE;
  }

  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/\b(am|pm)\b/i, (period) => period.toLowerCase());
};

export const formatTime = (value) => {
  const date = toValidDate(value);

  if (!date) {
    return EMPTY_VALUE;
  }

  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
  })
    .format(date)
    .replace(/\b(am|pm)\b/i, (period) => period.toLowerCase());
};

export const formatDateRange = (fromValue, toValue) => {
  const from = toValidDate(fromValue);
  const to = toValidDate(toValue);

  if (!from || !to) {
    return EMPTY_VALUE;
  }

  if (
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    from.getDate() === to.getDate()
  ) {
    return formatDate(from);
  }

  const day = new Intl.DateTimeFormat(LOCALE, { day: "2-digit" });
  const dayMonth = new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
  });
  const full = new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth()
  ) {
    const monthYear = new Intl.DateTimeFormat(LOCALE, {
      month: "short",
      year: "numeric",
    });

    return `${day.format(from)} – ${day.format(to)} ${monthYear.format(to)}`;
  }

  if (from.getFullYear() === to.getFullYear()) {
    return `${dayMonth.format(from)} – ${full.format(to)}`;
  }

  return `${full.format(from)} – ${full.format(to)}`;
};

export const formatDateInput = (value) => {
  const date = toValidDate(value);

  if (!date) {
    return EMPTY_VALUE;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const formatDayMonth = (value) => {
  const date = toValidDate(value);

  return date
    ? new Intl.DateTimeFormat(LOCALE, {
        day: "2-digit",
        month: "short",
      }).format(date)
    : EMPTY_VALUE;
};

export const formatNumber = (value, decimalPlacesOrOptions = 2) => {
  const number = toFiniteNumber(value);

  return number === null
    ? EMPTY_VALUE
    : new Intl.NumberFormat(
        LOCALE,
        getNumberOptions(decimalPlacesOrOptions),
      ).format(number);
};

export const formatQuantity = (value) => formatNumber(value, 2);

export const formatCurrency = (value, decimalPlacesOrOptions = 2) => {
  const number = toFiniteNumber(value);

  if (number === null) {
    return EMPTY_VALUE;
  }

  const options = getNumberOptions(decimalPlacesOrOptions);

  return new Intl.NumberFormat(LOCALE, {
    ...options,
    currency: "INR",
    style: "currency",
  }).format(number);
};

export const formatPercent = (value, decimalPlacesOrOptions = 1) => {
  const number = toFiniteNumber(value);

  if (number === null) {
    return EMPTY_VALUE;
  }

  const options = getNumberOptions(decimalPlacesOrOptions);

  return new Intl.NumberFormat(LOCALE, {
    ...options,
    style: "percent",
  }).format(Math.abs(number) > 1 ? number / 100 : number);
};
