export const DEFAULT_INVENTORY_PAGE_SIZE = 20;
export const MAX_INVENTORY_PAGE_SIZE = 200;

export const clampInventoryPageSize = (
  value,
  fallback = DEFAULT_INVENTORY_PAGE_SIZE,
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(
    MAX_INVENTORY_PAGE_SIZE,
    Math.max(1, Math.trunc(numericValue)),
  );
};

export const sanitizeInventoryListParams = (
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

  const sanitizedParams = {
    ...params,
    PageNumber:
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.trunc(pageNumber)
        : 1,
    PageSize: clampInventoryPageSize(params.PageSize),
  };

  if (sortBy && ["asc", "desc"].includes(sortDirection)) {
    sanitizedParams.SortBy = sortBy;
    sanitizedParams.SortDirection = sortDirection;
  } else {
    delete sanitizedParams.SortBy;
    delete sanitizedParams.SortDirection;
  }

  return sanitizedParams;
};
