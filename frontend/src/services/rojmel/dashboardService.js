import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const getDashboardData = async (endpoint, params, signal) => {
  const response = await axiosInstance.get(endpoint, {
    params: normalizeParams(params),
    signal,
  });

  return unwrapResponse(response);
};

export const rojmelDashboardService = {
  getSummary: async (params, { signal } = {}) =>
    getDashboardData(
      ENDPOINTS.ROJMEL_DASHBOARD_SUMMARY,
      params,
      signal,
    ),

  getWalletBalances: async (params, { signal } = {}) =>
    getDashboardData(
      ENDPOINTS.ROJMEL_DASHBOARD_WALLET_BALANCES,
      params,
      signal,
    ),

  getRecentTransactions: async (params, { signal } = {}) =>
    getDashboardData(ENDPOINTS.ROJMEL_DASHBOARD_RECENT, params, signal),
};
