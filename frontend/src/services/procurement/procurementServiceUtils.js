import { createApiError } from "../../utils/apiError";
import { normalizeParams } from "../apiServiceUtils";

export const PROCUREMENT_DEFAULT_PAGE_SIZE = 20;

const normalizeSort = (params, validSortFields) => {
  const requestedSort = String(params.SortBy ?? "").trim().toLowerCase();
  const sortBy = validSortFields.find(
    (field) => field.toLowerCase() === requestedSort,
  );
  const sortDirection = String(params.SortDirection ?? "")
    .trim()
    .toLowerCase();

  if (sortBy && ["asc", "desc"].includes(sortDirection)) {
    return { SortBy: sortBy, SortDirection: sortDirection };
  }

  return { SortBy: undefined, SortDirection: undefined };
};

export const sanitizeProcurementListParams = (
  params = {},
  validSortFields = [],
) => {
  // Procurement list endpoints bind PascalCase query names. Keep that casing
  // intact while applying the shared PageSize <= 200 and empty-value rules.
  const requestedPage = Number(params.PageNumber ?? params.Page);
  const requestedPageSize = Number(params.PageSize);

  return normalizeParams({
    ...params,
    Page: undefined,
    PageNumber:
      Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.trunc(requestedPage)
        : 1,
    PageSize:
      Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.trunc(requestedPageSize)
        : PROCUREMENT_DEFAULT_PAGE_SIZE,
    ...normalizeSort(params, validSortFields),
  });
};

export const sanitizeProcurementParams = (params = {}) =>
  normalizeParams(params);

const getFilename = (contentDisposition, fallbackFilename) => {
  const value = String(contentDisposition ?? "");
  const encodedMatch = value.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].replace(/["']/g, ""));
    } catch {
      return encodedMatch[1].replace(/["']/g, "");
    }
  }

  const plainMatch = value.match(/filename\s*=\s*"?([^";]+)"?/i);

  return plainMatch?.[1]?.trim() || fallbackFilename;
};

const hydrateBlobError = async (error) => {
  const blob = error?.response?.data;

  if (!(blob instanceof Blob)) {
    return error;
  }

  try {
    const text = await blob.text();
    const data = JSON.parse(text);
    error.response.data = data;
    error.apiError = data;
  } catch {
    // Keep the original response when the server did not return JSON.
  }

  return error;
};

export const downloadFile = async (
  axiosInstance,
  {
    data,
    fallbackFilename = "download",
    method = "get",
    params,
    url,
  },
) => {
  try {
    const response = await axiosInstance.request({
      data,
      method,
      params,
      responseType: "blob",
      url,
    });
    const filename = getFilename(
      response.headers?.["content-disposition"],
      fallbackFilename,
    );
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

    return { filename };
  } catch (error) {
    const hydratedError = await hydrateBlobError(error);
    const payload = hydratedError?.response?.data;

    if (payload?.succeeded === false) {
      throw createApiError(payload, hydratedError.response);
    }

    throw hydratedError;
  }
};
