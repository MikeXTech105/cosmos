export const DEFAULT_SHIPMENT_PAGE_SIZE = 20;
export const MAX_SHIPMENT_PAGE_SIZE = 200;

const LIST_KEYS = Object.freeze([
  "Search",
  "ChannelId",
  "WarehouseId",
  "Status",
  "SourceType",
  "FromDate",
  "ToDate",
  "PageNumber",
  "PageSize",
]);

const REPORT_KEYS = Object.freeze([
  "ChannelId",
  "WarehouseId",
  "Status",
  "FromDate",
  "ToDate",
  "PageNumber",
  "PageSize",
]);

const isPresent = (value) =>
  value !== "" && value !== null && value !== undefined;

export const clampShipmentPageSize = (
  value,
  fallback = DEFAULT_SHIPMENT_PAGE_SIZE,
) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.min(MAX_SHIPMENT_PAGE_SIZE, Math.max(1, Math.trunc(numeric)));
};

const pick = (params, keys) =>
  Object.fromEntries(
    keys
      .map((key) => [key, params?.[key]])
      .filter(([, value]) => isPresent(value)),
  );

const withPaging = (params, keys) => {
  const output = pick(params, keys);
  const pageNumber = Number(params?.PageNumber);

  output.PageNumber =
    Number.isFinite(pageNumber) && pageNumber > 0
      ? Math.trunc(pageNumber)
      : 1;
  output.PageSize = clampShipmentPageSize(params?.PageSize);

  return output;
};

export const sanitizeShipmentListParams = (params = {}) =>
  withPaging(params, LIST_KEYS);

export const sanitizeShipmentReportParams = (params = {}) =>
  withPaging(params, REPORT_KEYS);

export const sanitizeShipmentReportExportParams = (params = {}) =>
  pick(params, REPORT_KEYS.filter((key) => !key.startsWith("Page")));

export const sanitizeShipmentPackingParams = (params = {}) =>
  pick(params, ["AllowMixedPackages", "IncludeLoosePackage"]);

export const sanitizeShipmentDashboardParams = (params = {}) =>
  pick(params, ["asOfDate"]);

export const sanitizeShipmentTransporterParams = (params = {}) =>
  pick(params, ["search"]);

export const sanitizeShipmentImportParams = (params = {}) => {
  const output = withPaging(params, ["Status", "PageNumber", "PageSize"]);

  if (isPresent(params?.Status)) {
    const numericStatus = Number(params.Status);

    if (Number.isInteger(numericStatus)) {
      output.Status = numericStatus;
    } else {
      delete output.Status;
    }
  }

  return output;
};

