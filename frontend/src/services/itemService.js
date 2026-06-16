import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { sanitizeInventoryListParams } from "../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "./apiServiceUtils";

const ITEM_SORT_FIELDS = ["name", "itemCode", "createdAt"];

const buildItemCommandBody = (payload) => {
  return payload;
};

export const itemService = {
  getItems: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.ITEMS, {
      params: normalizeParams(
        sanitizeInventoryListParams(params, ITEM_SORT_FIELDS),
      ),
    });

    return unwrapResponse(response);
  },

  getItemById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.ITEM_BY_ID(id));

    return unwrapResponse(response);
  },

  createItem: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ITEMS,
      buildItemCommandBody(payload),
    );

    return unwrapResponse(response);
  },

  updateItem: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.ITEM_BY_ID(id),
      buildItemCommandBody(payload),
    );

    return unwrapResponse(response);
  },

  deleteItem: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.ITEM_BY_ID(id));

    return unwrapResponse(response);
  },
};
