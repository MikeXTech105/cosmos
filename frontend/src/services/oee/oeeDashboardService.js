import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeOeeFilters } from "./oeeServiceUtils";

const getDashboard = async (endpoint, params) => {
  const response = await axiosInstance.get(endpoint, {
    params: sanitizeOeeFilters(params),
  });

  return unwrapResponse(response);
};

export const oeeDashboardService = {
  getSummary: (params) =>
    getDashboard(ENDPOINTS.OEE_DASHBOARD_SUMMARY, params),

  getMachineWise: (params) =>
    getDashboard(ENDPOINTS.OEE_DASHBOARD_MACHINE_WISE, params),

  getMouldWise: (params) =>
    getDashboard(ENDPOINTS.OEE_DASHBOARD_MOULD_WISE, params),

  getTopDowntimeReasons: (params) =>
    getDashboard(ENDPOINTS.OEE_DASHBOARD_TOP_DOWNTIME, params),

  getDailyTrend: (params) =>
    getDashboard(ENDPOINTS.OEE_DASHBOARD_DAILY_TREND, params),
};
