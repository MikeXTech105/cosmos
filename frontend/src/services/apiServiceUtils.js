import { createApiError } from "../utils/apiError";

const MAX_PAGE_SIZE = 200;

export const unwrapResponse = (response) => {
  const responseData = response.data;

  if (
    responseData?.succeeded === false ||
    responseData?.data?.succeeded === false
  ) {
    throw createApiError(
      responseData?.succeeded === false ? responseData : responseData.data,
      response,
    );
  }

  const hasDataEnvelope = responseData?.data !== undefined;
  const data = hasDataEnvelope ? responseData.data : responseData;

  return {
    correlationId:
      responseData?.correlationId ??
      data?.correlationId ??
      null,
    data,
    message: responseData?.message ?? data?.message,
    meta:
      responseData?.meta ??
      responseData?.pagination ??
      data?.meta ??
      data?.pagination ??
      null,
  };
};

const normalizeParamValue = (key, value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (key === "PageSize") {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return undefined;
    }

    return Math.min(Math.trunc(numericValue), MAX_PAGE_SIZE);
  }

  if (
    (key === "SortBy" || key === "SortDirection") &&
    String(value).trim() === ""
  ) {
    return undefined;
  }

  return value;
};

export const normalizeParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, normalizeParamValue(key, value)])
      .filter(([, value]) => value !== undefined),
  );
};
