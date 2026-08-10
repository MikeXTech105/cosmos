import {
  DATA_BOOK_SORT_DIRECTIONS,
  DATA_BOOK_SORT_FIELDS,
  DATA_BOOK_VISIBILITY,
} from "../constants/dataBookEnums";

export const DEFAULT_DATA_BOOK_PAGE_SIZE = 20;
export const MAX_DATA_BOOK_PAGE_SIZE = 200;

const LIST_PARAM_KEYS = [
  "Search",
  "Category",
  "Visibility",
  "CreatedByUserId",
  "UpdatedByUserId",
  "FromDate",
  "ToDate",
  "PageNumber",
  "PageSize",
  "SortBy",
  "SortDirection",
];

const EXPORT_PARAM_KEYS = LIST_PARAM_KEYS.filter(
  (key) => key !== "PageNumber" && key !== "PageSize",
);

const cleanOptionalValue = (value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

export const clampDataBookPageSize = (
  value,
  fallback = DEFAULT_DATA_BOOK_PAGE_SIZE,
) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return fallback;

  return Math.min(MAX_DATA_BOOK_PAGE_SIZE, Math.trunc(number));
};

const pickParams = (params, keys) => {
  return Object.fromEntries(
    keys
      .map((key) => [key, cleanOptionalValue(params?.[key])])
      .filter(([, value]) => value !== undefined),
  );
};

const sanitizeSort = (params) => {
  const requestedField = String(params.SortBy ?? "").trim().toLowerCase();
  const requestedDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();
  const sortBy = DATA_BOOK_SORT_FIELDS.find(
    (field) => field.toLowerCase() === requestedField,
  );

  if (
    sortBy &&
    DATA_BOOK_SORT_DIRECTIONS.includes(requestedDirection)
  ) {
    return {
      ...params,
      SortBy: sortBy,
      SortDirection: requestedDirection,
    };
  }

  const sanitized = { ...params };
  delete sanitized.SortBy;
  delete sanitized.SortDirection;
  return sanitized;
};

const sanitizeVisibility = (params) => {
  const validValues = Object.values(DATA_BOOK_VISIBILITY);

  if (
    params.Visibility !== undefined &&
    !validValues.includes(params.Visibility)
  ) {
    return { ...params, Visibility: DATA_BOOK_VISIBILITY.ALL };
  }

  return params;
};

export const sanitizeDataBookListParams = (params = {}) => {
  const pageNumber = Number(params.PageNumber);
  const sanitized = sanitizeVisibility(
    sanitizeSort(pickParams(params, LIST_PARAM_KEYS)),
  );

  return {
    ...sanitized,
    PageNumber:
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.trunc(pageNumber)
        : 1,
    PageSize: clampDataBookPageSize(params.PageSize),
  };
};

export const sanitizeDataBookExportParams = (params = {}) => {
  const sanitized = sanitizeVisibility(
    sanitizeSort(pickParams(params, EXPORT_PARAM_KEYS)),
  );

  return {
    ...sanitized,
    format: "csv",
  };
};
