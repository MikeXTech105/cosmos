export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export const getPagedItems = (response) => {
  const data = response?.data ?? response;

  return Array.isArray(data) ? data : data?.items ?? [];
};

export const getTotalCount = (response, itemCount = 0) => {
  const data = response?.data ?? response;
  const total = Number(data?.totalCount);

  return Number.isFinite(total) ? total : itemCount;
};

export const effectiveSourceLabel = (source) => {
  const labels = {
    ProductOverride: "Product override",
    CategoryDefault: "Category default",
    Missing: "No active mapping",
  };

  return labels[source] ?? "No active mapping";
};

export const effectiveSourceTone = (source) => {
  if (source === "ProductOverride") return "brand";
  if (source === "CategoryDefault") return "emerald";
  return "amber";
};

export const formatEffectiveRange = (classification) => {
  if (!classification?.effectiveFrom) return "No active dated mapping";

  return classification.effectiveTo
    ? `${classification.effectiveFrom} to ${classification.effectiveTo}`
    : `From ${classification.effectiveFrom}`;
};

export const validateHsnSacInput = ({ code, description } = {}) => {
  const normalizedCode = String(code ?? "").trim();
  const normalizedDescription = String(description ?? "").trim();

  if (!normalizedCode || !normalizedDescription) {
    return "Code and description are required.";
  }

  if (normalizedCode.length > 50 || !/^[a-z0-9]+$/i.test(normalizedCode)) {
    return "Code must contain no more than 50 letters or digits.";
  }

  if (normalizedDescription.length > 500) {
    return "Description must be no more than 500 characters.";
  }

  return null;
};

export const validateRateVersionInput = ({
  effectiveFrom,
  effectiveTo,
  notes,
  ruleCode,
  totalRate,
} = {}) => {
  const rate = Number(totalRate);

  if (!String(ruleCode ?? "").trim() || totalRate === "" || !effectiveFrom) {
    return "Rule code, total rate, and effective date are required.";
  }

  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return "Total rate must be between 0 and 100.";
  }

  if (effectiveTo && effectiveTo < effectiveFrom) {
    return "Effective-to date cannot be earlier than effective-from date.";
  }

  if (String(notes ?? "").length > 1000) {
    return "Notes must be no more than 1,000 characters.";
  }

  return null;
};
