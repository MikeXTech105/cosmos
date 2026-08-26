import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeDispatchReportExportParams,
  sanitizeDispatchReportParams,
} from "../../utils/dispatchQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const dispatchReportService = {
  list: async (params = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.DP_RECOMMENDATION_REPORTS,
      {
        params: normalizeParams(sanitizeDispatchReportParams(params)),
      },
    );
    return unwrapResponse(response);
  },
  export: (params = {}) =>
    axiosInstance.get(ENDPOINTS.DP_RECOMMENDATION_REPORT_EXPORT, {
      params: normalizeParams(sanitizeDispatchReportExportParams(params)),
      responseType: "blob",
    }),
};
