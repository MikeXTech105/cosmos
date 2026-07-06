export const normalizeHrNumberInput = (rawValue, allowDecimal = true) => {
  const allowedPattern = allowDecimal ? /[^\d.]/g : /[^\d]/g;
  const value = String(rawValue ?? "").replace(allowedPattern, "");

  if (!value) {
    return "";
  }

  if (!allowDecimal) {
    return value.replace(/^0+(?=\d)/, "") || "0";
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

export const normalizeHrNumberBlurValue = (value, allowDecimal = true) => {
  const normalized = normalizeHrNumberInput(value, allowDecimal);

  if (!normalized) {
    return "0";
  }

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numericValue = Number(completedValue);

  return Number.isFinite(numericValue) ? String(numericValue) : "0";
};
