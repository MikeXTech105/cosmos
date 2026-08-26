export const DEFAULT_DISPATCH_PAGE_SIZE = 20;
export const MAX_DISPATCH_PAGE_SIZE = 200;

const PARAM_KEYS = Object.freeze({
  imports: [
    "ImportType",
    "ChannelId",
    "Status",
    "PageNumber",
    "PageSize",
  ],
  recommendations: [
    "Search",
    "WarehouseId",
    "ItemId",
    "Tier",
    "AllocatedOnly",
  ],
  reports: [
    "ChannelId",
    "WarehouseId",
    "FromDate",
    "ToDate",
    "Status",
    "PageNumber",
    "PageSize",
  ],
  runs: [
    "ChannelId",
    "Status",
    "FromDate",
    "ToDate",
    "PageNumber",
    "PageSize",
  ],
  settings: [
    "Search",
    "ItemId",
    "ChannelId",
    "IsActive",
    "EffectiveOn",
    "PageNumber",
    "PageSize",
  ],
});

export const clampDispatchPageSize = (
  value,
  fallback = DEFAULT_DISPATCH_PAGE_SIZE,
) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.min(MAX_DISPATCH_PAGE_SIZE, Math.max(1, Math.trunc(numeric)));
};

const sanitize = (params, type) => {
  const keys = PARAM_KEYS[type];
  const output = Object.fromEntries(keys.map((key) => [key, params?.[key]]));

  if (keys.includes("PageNumber")) {
    const page = Number(params?.PageNumber);
    output.PageNumber =
      Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
    output.PageSize = clampDispatchPageSize(params?.PageSize);
  }

  return Object.fromEntries(
    Object.entries(output).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  );
};

export const sanitizeDispatchSettingParams = (params = {}) =>
  sanitize(params, "settings");

export const sanitizeDispatchImportParams = (params = {}) =>
  sanitize(params, "imports");

export const sanitizeDispatchRunParams = (params = {}) =>
  sanitize(params, "runs");

export const sanitizeDispatchRecommendationParams = (params = {}) =>
  sanitize(params, "recommendations");

export const sanitizeDispatchReportParams = (params = {}) =>
  sanitize(params, "reports");

export const sanitizeDispatchReportExportParams = (params = {}) =>
  Object.fromEntries(
    ["ChannelId", "WarehouseId", "FromDate", "ToDate", "Status"]
      .map((key) => [key, params?.[key]])
      .filter(
        ([, value]) =>
          value !== "" && value !== null && value !== undefined,
      ),
  );
