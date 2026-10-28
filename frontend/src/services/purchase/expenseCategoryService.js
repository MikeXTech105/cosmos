import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizePurchaseListParams } from "./purchaseServiceUtils";

const SORT_FIELDS = ["name", "createdAt", "createdOn"];

export const expenseCategoryService = {
  getExpenseCategories: async (params, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.EXPENSE_CATEGORIES, {
      signal,
      params: sanitizePurchaseListParams(params, SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getExpenseCategoryById: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.EXPENSE_CATEGORY_BY_ID(id),
      { signal },
    );

    return unwrapResponse(response);
  },

  createExpenseCategory: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.EXPENSE_CATEGORIES,
      payload,
    );

    return unwrapResponse(response);
  },

  updateExpenseCategory: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.EXPENSE_CATEGORY_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteExpenseCategory: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.EXPENSE_CATEGORY_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
