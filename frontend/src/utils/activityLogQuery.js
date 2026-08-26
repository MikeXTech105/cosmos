import {
  ACTIVITY_LOG_SORT_DIRECTIONS,
  ACTIVITY_LOG_SORT_FIELDS,
  DEFAULT_ACTIVITY_LOG_PAGE_SIZE,
  MAX_ACTIVITY_LOG_PAGE_SIZE,
} from "../constants/activityLogConstants";

const FILTER_PARAM_KEYS = Object.freeze([
  "Search",
  "UserId",
  "Username",
  "Module",
  "Action",
  "EntityType",
  "EntityId",
  "FromDate",
  "ToDate",
  "HttpMethod",
  "StatusCode",
  "CorrelationId",
  "SortBy",
  "SortDirection",
]);

const LIST_PARAM_KEYS = Object.freeze([
  ...FILTER_PARAM_KEYS,
  "PageNumber",
  "PageSize",
]);

const cleanOptionalValue = (value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return typeof value === "string" ? value.trim() : value;
};

const pickParams = (params, keys) => {
  return Object.fromEntries(
    keys
      .map((key) => [key, cleanOptionalValue(params?.[key])])
      .filter(([, value]) => value !== undefined),
  );
};

export const clampActivityLogPageSize = (
  value,
  fallback = DEFAULT_ACTIVITY_LOG_PAGE_SIZE,
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) return fallback;

  return Math.min(MAX_ACTIVITY_LOG_PAGE_SIZE, Math.trunc(numericValue));
};

export const localDateTimeToUtcIso = (value) => {
  if (value === null || value === undefined || value === "") return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  const text = String(value).trim();
  if (!text) return undefined;

  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(text);

  return Number.isNaN(date.getTime()) ? text : date.toISOString();
};

const sanitizeSort = (params) => {
  const requestedField = String(params.SortBy ?? "").trim().toLowerCase();
  const requestedDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();
  const sortBy = ACTIVITY_LOG_SORT_FIELDS.find(
    (field) => field.toLowerCase() === requestedField,
  );

  if (
    sortBy &&
    ACTIVITY_LOG_SORT_DIRECTIONS.includes(requestedDirection)
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

const sanitizeFilters = (params, keys) => {
  const sanitized = sanitizeSort(pickParams(params, keys));

  if (sanitized.UserId !== undefined) {
    delete sanitized.Username;
  }

  if (sanitized.FromDate !== undefined) {
    sanitized.FromDate = localDateTimeToUtcIso(sanitized.FromDate);
  }

  if (sanitized.ToDate !== undefined) {
    sanitized.ToDate = localDateTimeToUtcIso(sanitized.ToDate);
  }

  return sanitized;
};

export const sanitizeActivityLogListParams = (params = {}) => {
  const pageNumber = Number(params.PageNumber);

  return {
    ...sanitizeFilters(params, LIST_PARAM_KEYS),
    PageNumber:
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.trunc(pageNumber)
        : 1,
    PageSize: clampActivityLogPageSize(params.PageSize),
  };
};

export const sanitizeActivityLogExportParams = (params = {}) => {
  return {
    ...sanitizeFilters(params, FILTER_PARAM_KEYS),
    format: "csv",
  };
};

export const countActiveActivityLogFilters = (filters = {}) => {
  const countableKeys = FILTER_PARAM_KEYS.filter(
    (key) => key !== "SortBy" && key !== "SortDirection",
  );
  let count = countableKeys.reduce(
    (total, key) =>
      cleanOptionalValue(filters[key]) === undefined ? total : total + 1,
    0,
  );

  if (
    cleanOptionalValue(filters.UserId) !== undefined &&
    cleanOptionalValue(filters.Username) !== undefined
  ) {
    count -= 1;
  }

  return count;
};

