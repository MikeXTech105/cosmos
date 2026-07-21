import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeRojmelListParams } from "../../utils/rojmelQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const MY_WALLET_SORT_FIELDS = ["transactionDate", "createdAt", "amount"];

const getPaged = async (endpoint, params, signal) => {
  const response = await axiosInstance.get(endpoint, {
    params: normalizeParams(
      sanitizeRojmelListParams(params, MY_WALLET_SORT_FIELDS),
    ),
    signal,
  });

  return unwrapResponse(response);
};

export const myWalletService = {
  getWallet: async ({ signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.ROJMEL_MY_WALLET, {
      signal,
    });

    return unwrapResponse(response);
  },

  getTransactions: async (params, { signal } = {}) =>
    getPaged(ENDPOINTS.ROJMEL_MY_WALLET_TRANSACTIONS, params, signal),

  getLedger: async (params, { signal } = {}) =>
    getPaged(ENDPOINTS.ROJMEL_MY_WALLET_LEDGER, params, signal),

  createIncome: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_MY_WALLET_INCOME,
      payload,
    );

    return unwrapResponse(response);
  },

  createExpense: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_MY_WALLET_EXPENSE,
      payload,
    );

    return unwrapResponse(response);
  },

  getCategories: async (categoryType, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.ROJMEL_MY_WALLET_CATEGORIES,
      {
        params: normalizeParams({ categoryType }),
        signal,
      },
    );

    return unwrapResponse(response);
  },
};
