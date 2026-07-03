import { normalizeParams } from "../apiServiceUtils";

export const PURCHASE_DEFAULT_PAGE_SIZE = 20;
export const PURCHASE_MAX_PAGE_SIZE = 200;

export const clampPurchasePageSize = (
  value,
  fallback = PURCHASE_DEFAULT_PAGE_SIZE,
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(
    PURCHASE_MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(numericValue)),
  );
};

export const sanitizePurchaseListParams = (
  params = {},
  validSortFields = [],
) => {
  const requestedSort = String(params.SortBy ?? "").trim().toLowerCase();
  const sortBy = validSortFields.find(
    (field) => field.toLowerCase() === requestedSort,
  );
  const sortDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();
  const pageNumber = Number(params.PageNumber);
  const sanitizedParams = {
    ...params,
    PageNumber:
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.trunc(pageNumber)
        : 1,
    PageSize: clampPurchasePageSize(params.PageSize),
  };

  if (sortBy && ["asc", "desc"].includes(sortDirection)) {
    sanitizedParams.SortBy = sortBy;
    sanitizedParams.SortDirection = sortDirection;
  } else {
    delete sanitizedParams.SortBy;
    delete sanitizedParams.SortDirection;
  }

  return normalizeParams(sanitizedParams);
};
