import axiosInstance from "../manufacturing/productionApi";
import { wireFinancialEntry } from "../../utils/financialEntry";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizePurchaseListParams } from "./purchaseServiceUtils";

const SORT_FIELDS = ["expenseDate", "amount", "createdAt", "createdOn"];

export const expenseService = {
  getExpenses: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.EXPENSES, {
      params: sanitizePurchaseListParams(params, SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getExpenseById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.EXPENSE_BY_ID(id));

    return unwrapResponse(response);
  },

  createExpense: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.EXPENSES, wireFinancialEntry(payload));

    return unwrapResponse(response);
  },

  updateExpense: async (id, payload) => {
    const response = await axiosInstance.put(ENDPOINTS.EXPENSE_BY_ID(id), wireFinancialEntry(payload));

    return unwrapResponse(response);
  },

  deleteExpense: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.EXPENSE_BY_ID(id));

    return unwrapResponse(response);
  },
};
