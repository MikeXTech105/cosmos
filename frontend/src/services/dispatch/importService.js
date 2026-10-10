import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeDispatchImportParams } from "../../utils/dispatchQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const dispatchImportService = {
  validate: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_IMPORT_VALIDATE,
      payload,
    );
    return unwrapResponse(response);
  },
  validateManual: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_MANUAL_IMPORT_VALIDATE,
      payload,
    );
    return unwrapResponse(response);
  },
  list: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.DP_IMPORTS, {
      params: normalizeParams(sanitizeDispatchImportParams(params)),
    });
    return unwrapResponse(response);
  },
  commit: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_IMPORT_COMMIT(id),
      payload,
    );
    return unwrapResponse(response);
  },
  cancel: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_IMPORT_CANCEL(id),
      { reason },
    );
    return unwrapResponse(response);
  },
};
