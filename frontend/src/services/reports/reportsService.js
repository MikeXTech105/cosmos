import axiosInstance from "../manufacturing/productionApi";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const runReport = async (endpoint, params, { signal } = {}) => {
  const response = await axiosInstance.get(endpoint, {
    params: normalizeParams(params),
    signal,
  });
  const payload = unwrapResponse(response);

  return {
    correlationId: response.data?.correlationId ?? payload?.correlationId ?? null,
    data: payload.data,
    message: payload.message,
    meta: payload.meta,
  };
};
