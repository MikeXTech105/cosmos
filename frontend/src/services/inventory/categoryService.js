import axiosInstance from "../../api/axios";
import exactApi from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const CATEGORY_SORT_FIELDS = ["name", "createdAt"];

export const categoryService = {
  getCategories: async (params, { signal } = {}) => {
    const response = await exactApi.get(ENDPOINTS.CATEGORIES, {
      signal,
      params: normalizeParams(
        sanitizeInventoryListParams(params, CATEGORY_SORT_FIELDS),
      ),
    });

    return unwrapResponse(response);
  },

  getCategoryById: async (id, { signal } = {}) => {
    const response = await exactApi.get(ENDPOINTS.CATEGORY_BY_ID(id), { signal });

    return unwrapResponse(response);
  },

  createCategory: async (payload) => {
    const response = await exactApi.post(ENDPOINTS.CATEGORIES, payload);

    return unwrapResponse(response);
  },

  updateCategory: async (id, payload) => {
    const response = await exactApi.put(
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
