import { createApiError } from "../utils/apiError";

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

  if (responseData?.data !== undefined) {
    return {
      data: responseData.data,
      message: responseData.message,
      meta: responseData.meta ?? responseData.pagination ?? null,
    };
  }

  return {
    data: responseData,
    message: responseData?.message,
    meta: responseData?.meta ?? responseData?.pagination ?? null,
  };
};

export const normalizeParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  );
};
