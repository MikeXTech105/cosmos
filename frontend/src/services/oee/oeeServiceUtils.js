import {
  clampInventoryPageSize,
  DEFAULT_INVENTORY_PAGE_SIZE,
} from "../../utils/inventoryQuery";
import { normalizeParams } from "../apiServiceUtils";

const normalizeSort = (params, validSortFields) => {
  const requestedSort = String(params.SortBy ?? "").trim().toLowerCase();
  const sortBy = validSortFields.find(
    (field) => field.toLowerCase() === requestedSort,
  );
  const sortDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();

  if (sortBy && ["asc", "desc"].includes(sortDirection)) {
    return {
      SortBy: sortBy,
      SortDirection: sortDirection,
    };
  }

  return {
    SortBy: undefined,
    SortDirection: undefined,
  };
};

export const sanitizeOeeListParams = (
  params = {},
  validSortFields = [],
) => {
  const page = Number(params.Page ?? params.PageNumber);
  const pageNumber =
    Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;

  return normalizeParams({
    ...params,
    Page: pageNumber,
    PageNumber: undefined,
    PageSize: clampInventoryPageSize(
      params.PageSize,
      DEFAULT_INVENTORY_PAGE_SIZE,
    ),
    ...normalizeSort(params, validSortFields),
  });
};

export const sanitizeOeeFilters = (params = {}) => {
  return normalizeParams(params);
};
