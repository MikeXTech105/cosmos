import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeDispatchSettingParams } from "../../utils/dispatchQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const dispatchSettingService = {
  list: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.DP_SETTINGS, {
      params: normalizeParams(sanitizeDispatchSettingParams(params)),
    });
    return unwrapResponse(response);
  },
  getById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.DP_SETTING_BY_ID(id));
    return unwrapResponse(response);
  },
  create: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.DP_SETTINGS, payload);
    return unwrapResponse(response);
  },
  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.DP_SETTING_BY_ID(id),
      payload,
    );
    return unwrapResponse(response);
  },
  remove: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.DP_SETTING_BY_ID(id),
    );
    return unwrapResponse(response);
  },
};
