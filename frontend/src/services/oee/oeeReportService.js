import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeOeeFilters } from "./oeeServiceUtils";

const getReport = async (endpoint, params) => {
  const response = await axiosInstance.get(endpoint, {
    params: sanitizeOeeFilters(params),
  });

  return unwrapResponse(response);
};

export const oeeReportService = {
  getDailyReport: (params) => getReport(ENDPOINTS.OEE_REPORT_DAILY, params),

  getMachinePerformance: (params) =>
    getReport(ENDPOINTS.OEE_REPORT_MACHINE_PERFORMANCE, params),

  getMouldPerformance: (params) =>
    getReport(ENDPOINTS.OEE_REPORT_MOULD_PERFORMANCE, params),

  getDowntimeReport: (params) =>
    getReport(ENDPOINTS.OEE_REPORT_DOWNTIME, params),

  exportExcel: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.OEE_REPORT_EXPORT_EXCEL,
      {
        params: sanitizeOeeFilters(params),
        responseType: "blob",
      },
    );

    return {
      data: response.data,
      headers: response.headers,
    };
  },
};
