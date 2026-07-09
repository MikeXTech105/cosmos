import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const purchaseReportService = {
  getPurchaseSummary: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PURCHASE_REPORT_PURCHASE_SUMMARY,
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },

  getSupplierOutstanding: async () => {
    const response = await axiosInstance.get(
      ENDPOINTS.PURCHASE_REPORT_SUPPLIER_OUTSTANDING,
    );

    return unwrapResponse(response);
  },

  getExpenseSummary: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PURCHASE_REPORT_EXPENSE_SUMMARY,
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },

  getCategoryWiseExpense: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PURCHASE_REPORT_CATEGORY_WISE_EXPENSE,
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },

  getItemPurchaseHistory: async (itemId) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PURCHASE_REPORT_ITEM_PURCHASE_HISTORY,
      { params: normalizeParams({ itemId }) },
    );

    return unwrapResponse(response);
  },
};
