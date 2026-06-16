import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../utils/inventoryQuery";

export const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const buildInventoryQueryParams = ({
  filters,
  pageNumber,
  pageSize,
  extra = {},
}) => {
  return {
    Search: filters.Search?.trim() || undefined,
    IsActive:
      filters.IsActive === "all" ? undefined : filters.IsActive === "active",
    PageNumber: pageNumber,
    PageSize: clampInventoryPageSize(
      pageSize,
      DEFAULT_INVENTORY_PAGE_SIZE,
    ),
    SortBy: filters.SortBy || undefined,
    SortDirection: filters.SortDirection || undefined,
    ...extra,
  };
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getActionError = (error, fallback) => {
  if (typeof error === "string") {
    return error;
  }

  const errors = error?.response?.data?.errors;

  if (Array.isArray(errors) && errors.length > 0) {
    return errors.join(", ");
  }

  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    fallback
  );
};

export const getSuccessMessage = (response, fallback) => {
  return response?.message || fallback;
};

export const serializeId = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isNaN(numericValue) ? value : numericValue;
};
