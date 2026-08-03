import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeShipmentImportParams } from "../../utils/shipmentQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const shipmentImportService = {
  validate: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_IMPORT_VALIDATE,
      payload,
    );

    return unwrapResponse(response);
  },

  list: async (params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SO_IMPORTS, {
      params: normalizeParams(sanitizeShipmentImportParams(params)),
      signal,
    });

    return unwrapResponse(response);
  },

  commit: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_IMPORT_COMMIT(id),
      payload,
    );

    return unwrapResponse(response);
  },

  cancel: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_IMPORT_CANCEL(id),
      { reason },
    );

    return unwrapResponse(response);
  },
};

