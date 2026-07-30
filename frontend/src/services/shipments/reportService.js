import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeShipmentDashboardParams,
  sanitizeShipmentReportExportParams,
  sanitizeShipmentReportParams,
} from "../../utils/shipmentQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const shipmentReportService = {
  list: async (params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SO_REPORTS, {
      params: normalizeParams(sanitizeShipmentReportParams(params)),
      signal,
    });

    return unwrapResponse(response);
  },

  dashboard: async (params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SO_REPORTS_DASHBOARD,
      {
        params: normalizeParams(sanitizeShipmentDashboardParams(params)),
        signal,
      },
    );

    return unwrapResponse(response);
  },

  export: (params = {}) =>
    axiosInstance.get(ENDPOINTS.SO_REPORTS_EXPORT, {
      params: normalizeParams(sanitizeShipmentReportExportParams(params)),
      responseType: "blob",
    }),
};

