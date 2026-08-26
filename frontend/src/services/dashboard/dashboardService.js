import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const getDashboard = async (endpoint, params, config = {}) => {
  const response = await axiosInstance.get(endpoint, {
    ...config,
    params: normalizeParams(params),
  });

  return unwrapResponse(response);
};

export const dashboardService = {
  getAlerts: (params, config) =>
    getDashboard(ENDPOINTS.DASHBOARD_ALERTS, params, config),

  getHrSummary: (params, config) =>
    getDashboard(ENDPOINTS.DASHBOARD_HR_SUMMARY, params, config),

  getOverview: (params, config) =>
    getDashboard(ENDPOINTS.DASHBOARD_OVERVIEW, params, config),

  getRecentActivity: (params, config) =>
    getDashboard(ENDPOINTS.DASHBOARD_RECENT_ACTIVITY, params, config),

  getRevenueExpenseTrend: (params, config) =>
    getDashboard(
      ENDPOINTS.DASHBOARD_REVENUE_EXPENSE_TREND,
      params,
      config,
    ),

  getSalesPurchaseTrend: (params, config) =>
    getDashboard(
      ENDPOINTS.DASHBOARD_SALES_PURCHASE_TREND,
      params,
      config,
    ),

  getTopParties: (params, config) =>
    getDashboard(ENDPOINTS.DASHBOARD_TOP_PARTIES, params, config),

  getTopSellingItems: (params, config) =>
    getDashboard(ENDPOINTS.DASHBOARD_TOP_SELLING_ITEMS, params, config),
};
