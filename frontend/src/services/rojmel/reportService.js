import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeRojmelListParams } from "../../utils/rojmelQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const REPORT_SORT_FIELDS = ["transactionDate", "createdAt", "amount"];

const getReport = async (endpoint, params, signal) => {
  const response = await axiosInstance.get(endpoint, {
    params: normalizeParams(
      sanitizeRojmelListParams(params, REPORT_SORT_FIELDS),
    ),
    signal,
  });
  const payload = unwrapResponse(response);

  return {
    ...payload,
    correlationId: response.data?.correlationId ?? null,
  };
};

export const rojmelReportService = {
  getWalletLedger: (params, { signal } = {}) =>
    getReport(ENDPOINTS.ROJMEL_REPORT_WALLET_LEDGER, params, signal),
  getAllTransactions: (params, { signal } = {}) =>
    getReport(ENDPOINTS.ROJMEL_REPORT_ALL_TRANSACTIONS, params, signal),
  getIncomeExpense: (params, { signal } = {}) =>
    getReport(ENDPOINTS.ROJMEL_REPORT_INCOME_EXPENSE, params, signal),
  getCategoryExpense: (params, { signal } = {}) =>
    getReport(ENDPOINTS.ROJMEL_REPORT_CATEGORY_EXPENSE, params, signal),
  getTransfers: (params, { signal } = {}) =>
    getReport(ENDPOINTS.ROJMEL_REPORT_TRANSFERS, params, signal),
  getDailyCashFlow: (params, { signal } = {}) =>
    getReport(ENDPOINTS.ROJMEL_REPORT_DAILY_CASH_FLOW, params, signal),
  getUserWalletBalances: (params, { signal } = {}) =>
    getReport(
      ENDPOINTS.ROJMEL_REPORT_USER_WALLET_BALANCES,
      params,
      signal,
    ),
};
