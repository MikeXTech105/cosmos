import {
  DEFAULT_WEBSITE_PAGE_SIZE,
  MAX_WEBSITE_PAGE_SIZE,
} from "../constants/websiteEnums";
import { normalizeParams } from "../services/apiServiceUtils";

const cleanText = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

export const clampWebsitePageSize = (
  value,
  fallback = DEFAULT_WEBSITE_PAGE_SIZE,
) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(MAX_WEBSITE_PAGE_SIZE, Math.trunc(number));
};

const localToUtc = (value) => {
  const text = cleanText(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
};

const readParam = (params, key) => {
  if (Object.prototype.hasOwnProperty.call(params || {}, key)) return params[key];
  const camelKey = `${key.charAt(0).toLowerCase()}${key.slice(1)}`;
  return params?.[camelKey];
};

const pick = (params, keys) =>
  Object.fromEntries(keys.map((key) => [key, readParam(params, key)]));

const pageParams = (params, keys) =>
  normalizeParams({
    ...pick(params, keys),
    PageNumber: Math.max(1, Number(readParam(params, "PageNumber")) || 1),
    PageSize: clampWebsitePageSize(readParam(params, "PageSize")),
  });

export const sanitizeWebsiteProductParams = (params = {}) =>
  pageParams(params, [
    "Search",
    "PublishStatus",
    "IsActive",
    "SortBy",
    "SortDirection",
  ]);

export const sanitizeWebsiteBlogParams = (params = {}) =>
  pageParams(params, [
    "Search",
    "CategoryId",
    "PublishStatus",
    "SortBy",
    "SortDirection",
  ]);

export const sanitizeWebsiteAnnouncementParams = (params = {}) =>
  pageParams(params, ["Placement", "IsActive"]);

export const sanitizeWarrantyClaimParams = (params = {}) =>
  pageParams(
    {
      ...params,
      SubmittedFromUtc: localToUtc(readParam(params, "SubmittedFromUtc")),
      SubmittedToUtc: localToUtc(readParam(params, "SubmittedToUtc")),
    },
    [
      "Search",
      "Status",
      "ResolutionType",
      "AssignedToUserId",
      "SubmittedFromUtc",
      "SubmittedToUtc",
      "PurchaseDateFrom",
      "PurchaseDateTo",
      "SortBy",
      "SortDirection",
    ],
  );

export const countWebsiteFilters = (filters = {}) =>
  Object.entries(filters).filter(
    ([key, value]) =>
      !["PageNumber", "PageSize", "SortBy", "SortDirection"].includes(key) &&
      value !== "" &&
      value !== null &&
      value !== undefined,
  ).length;
