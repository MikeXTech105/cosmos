import {
  EMPTY_VALUE,
  formatDate,
  formatNumber,
} from "../../utils/format";

export const SUPPLY_CHAIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

export const formatSupplyChainNumber = (
  value,
  fallback = EMPTY_VALUE,
  maximumFractionDigits = 2,
) => {
  const formatted = formatNumber(value, maximumFractionDigits);
  return formatted === EMPTY_VALUE ? fallback : formatted;
};

export const formatSupplyChainDate = (value, fallback = EMPTY_VALUE) => {
  const formatted = formatDate(value);
  return formatted === EMPTY_VALUE ? fallback : formatted;
};
