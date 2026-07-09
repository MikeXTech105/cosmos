import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const CATEGORY_SORT_FIELDS = ["name", "createdAt"];

export const categoryService = {
  getCategories: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.CATEGORIES, {
      params: normalizeParams(
        sanitizeInventoryListParams(params, CATEGORY_SORT_FIELDS),
      ),
    });

    return unwrapResponse(response);
  },

  getCategoryById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.CATEGORY_BY_ID(id));

    return unwrapResponse(response);
  },

  createCategory: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.CATEGORIES, payload);

    return unwrapResponse(response);
  },

  updateCategory: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.CATEGORY_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteCategory: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.CATEGORY_BY_ID(id));

    return unwrapResponse(response);
  },
};
