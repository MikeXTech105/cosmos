import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeActivityLogExportParams,
  sanitizeActivityLogListParams,
} from "../../utils/activityLogQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const activityLogService = {
  exportLogs: (params, config = {}) => {
    return axiosInstance.get(ENDPOINTS.ACTIVITY_LOGS_EXPORT, {
      ...config,
      params: normalizeParams(sanitizeActivityLogExportParams(params)),
      responseType: "blob",
    });
  },

  getLogById: async (id, config = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.ACTIVITY_LOG_BY_ID(id),
      config,
    );
    return unwrapResponse(response);
  },

  getLogs: async (params, config = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.ACTIVITY_LOGS, {
      ...config,
      params: normalizeParams(sanitizeActivityLogListParams(params)),
    });
    return unwrapResponse(response);
  },
};

