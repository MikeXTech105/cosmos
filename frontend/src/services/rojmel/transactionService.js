import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeRojmelListParams } from "../../utils/rojmelQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const TRANSACTION_SORT_FIELDS = ["transactionDate", "createdAt", "amount"];

export const transactionService = {
  getTransactions: async (params, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.ROJMEL_TRANSACTIONS, {
      params: normalizeParams(
        sanitizeRojmelListParams(params, TRANSACTION_SORT_FIELDS),
      ),
      signal,
    });

    return unwrapResponse(response);
  },

  getTransactionById: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.ROJMEL_TRANSACTION_BY_ID(id),
      { signal },
    );

    return unwrapResponse(response);
  },

  createIncome: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_TRANSACTION_INCOME,
      payload,
    );

    return unwrapResponse(response);
  },

  createExpense: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_TRANSACTION_EXPENSE,
      payload,
    );

    return unwrapResponse(response);
  },

  createAdjustment: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_TRANSACTION_ADJUSTMENT,
      payload,
    );

    return unwrapResponse(response);
  },

  cancelTransaction: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_TRANSACTION_CANCEL(id),
      { reason },
    );

    return unwrapResponse(response);
  },
};
