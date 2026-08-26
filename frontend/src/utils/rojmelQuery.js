export const DEFAULT_ROJMEL_PAGE_SIZE = 20;
export const MAX_ROJMEL_PAGE_SIZE = 200;

export const clampRojmelPageSize = (
  value,
  fallback = DEFAULT_ROJMEL_PAGE_SIZE,
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(
    MAX_ROJMEL_PAGE_SIZE,
    Math.max(1, Math.trunc(numericValue)),
  );
};

export const sanitizeRojmelListParams = (
  params = {},
  validSortFields = [],
) => {
  const pageNumber = Number(params.PageNumber);
  const requestedSort = String(params.SortBy ?? "").trim().toLowerCase();
  const sortBy = validSortFields.find(
    (field) => field.toLowerCase() === requestedSort,
  );
  const sortDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();
  const sanitized = {
    ...params,
    PageNumber:
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.trunc(pageNumber)
        : 1,
    PageSize: clampRojmelPageSize(params.PageSize),
  };

  if (sortBy && ["asc", "desc"].includes(sortDirection)) {
    sanitized.SortBy = sortBy;
    sanitized.SortDirection = sortDirection;
  } else {
    delete sanitized.SortBy;
    delete sanitized.SortDirection;
  }

  return sanitized;
};
