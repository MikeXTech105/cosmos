const DANGEROUS_FORMULA_PREFIX = /^[\s]*[=+\-@]/;
const NUMERIC_TEXT =
  /^[-+]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)%?$/;

export const sanitizeCsvValue = (value) => {
  const text = String(value ?? "");
  const trimmedText = text.trim();

  if (!DANGEROUS_FORMULA_PREFIX.test(text) || NUMERIC_TEXT.test(trimmedText)) {
    return text;
  }

  return `'${text}`;
};

export const escapeCsvValue = (value) => {
  const text = sanitizeCsvValue(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
