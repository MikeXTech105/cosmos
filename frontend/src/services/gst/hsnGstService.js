import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const hsnGstService = {
  listRateVersions: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.GST_RATE_VERSIONS, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  createRateVersion: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.GST_RATE_VERSIONS,
      payload,
    );

    return unwrapResponse(response);
  },

};
