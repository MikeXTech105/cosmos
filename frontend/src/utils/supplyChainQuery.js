export const DEFAULT_SUPPLY_CHAIN_PAGE_SIZE = 20;
export const MAX_SUPPLY_CHAIN_PAGE_SIZE = 200;

export const SUPPLY_CHAIN_SORT_FIELDS = Object.freeze({
  channels: ["code", "name", "sortOrder", "isActive", "createdAtUtc"],
  itemMappings: [
    "channelCode",
    "channelSku",
    "itemCode",
    "itemName",
    "isPrimary",
    "isActive",
    "createdAtUtc",
  ],
  packagingProfiles: [
    "itemCode",
    "itemName",
    "packagingCode",
    "unitsPerBox",
    "isDefault",
    "isActive",
    "createdAtUtc",
  ],
  warehouses: [
    "warehouseCode",
    "warehouseName",
    "channelCode",
    "city",
    "state",
    "priority",
    "isActive",
    "createdAtUtc",
  ],
});

const LIST_PARAM_KEYS = Object.freeze({
  channels: [
    "Search",
    "IsActive",
    "PageNumber",
    "PageSize",
    "SortBy",
    "SortDirection",
  ],
  imports: [
    "ModuleType",
    "ImportType",
    "ChannelId",
    "Status",
    "PageNumber",
    "PageSize",
  ],
  itemMappings: [
    "Search",
    "ChannelId",
    "ItemId",
    "IsActive",
    "IsPrimary",
    "PageNumber",
    "PageSize",
    "SortBy",
    "SortDirection",
  ],
  packagingProfiles: [
    "Search",
    "ItemId",
    "ChannelId",
    "IsActive",
    "IsDefault",
    "PageNumber",
    "PageSize",
    "SortBy",
    "SortDirection",
  ],
  warehouses: [
    "Search",
    "ChannelId",
    "IsActive",
    "City",
    "State",
    "PageNumber",
    "PageSize",
    "SortBy",
    "SortDirection",
  ],
});

export const clampSupplyChainPageSize = (
  value,
  fallback = DEFAULT_SUPPLY_CHAIN_PAGE_SIZE,
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.min(
    MAX_SUPPLY_CHAIN_PAGE_SIZE,
    Math.max(1, Math.trunc(numericValue)),
  );
};

const sanitizeListParams = (params, type) => {
  const allowedKeys = LIST_PARAM_KEYS[type];
  const validSortFields = SUPPLY_CHAIN_SORT_FIELDS[type] ?? [];
  const requestedSort = String(params?.SortBy ?? "").trim().toLowerCase();
  const sortBy = validSortFields.find(
    (field) => field.toLowerCase() === requestedSort,
  );
  const sortDirection = String(params?.SortDirection ?? "")
    .trim()
    .toLowerCase();
  const pageNumber = Number(params?.PageNumber);
  const sanitized = Object.fromEntries(
    allowedKeys.map((key) => [key, params?.[key]]),
  );

  sanitized.PageNumber =
    Number.isFinite(pageNumber) && pageNumber > 0
      ? Math.trunc(pageNumber)
      : 1;
  sanitized.PageSize = clampSupplyChainPageSize(params?.PageSize);

  if (
    allowedKeys.includes("SortBy") &&
    sortBy &&
    ["asc", "desc"].includes(sortDirection)
  ) {
    sanitized.SortBy = sortBy;
    sanitized.SortDirection = sortDirection;
  } else {
    delete sanitized.SortBy;
    delete sanitized.SortDirection;
  }

  return Object.fromEntries(
    Object.entries(sanitized).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
};

export const sanitizeSupplyChainChannelParams = (params = {}) =>
  sanitizeListParams(params, "channels");

export const sanitizeSupplyChainWarehouseParams = (params = {}) =>
  sanitizeListParams(params, "warehouses");

export const sanitizeSupplyChainItemMappingParams = (params = {}) =>
  sanitizeListParams(params, "itemMappings");

export const sanitizeSupplyChainPackagingParams = (params = {}) =>
  sanitizeListParams(params, "packagingProfiles");

export const sanitizeSupplyChainImportParams = (params = {}) =>
  sanitizeListParams(params, "imports");

export const sanitizeSupplyChainWarehouseDropdownParams = (params = {}) => {
  const channelId = params.channelId;

  return channelId === undefined || channelId === null || channelId === ""
    ? {}
    : { channelId };
};
