export const SUPPLY_CHAIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

export const formatSupplyChainNumber = (
  value,
  fallback = "—",
  maximumFractionDigits = 2,
) => {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", {
        maximumFractionDigits,
        minimumFractionDigits: 0,
      })
    : fallback;
};

export const formatSupplyChainDate = (value, fallback = "—") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
