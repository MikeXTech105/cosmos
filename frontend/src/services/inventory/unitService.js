import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const UNIT_SORT_FIELDS = ["name", "createdAt"];

export const unitService = {
  getUnits: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.UNITS, {
      params: normalizeParams(
        sanitizeInventoryListParams(params, UNIT_SORT_FIELDS),
      ),
    });

    return unwrapResponse(response);
  },

  getUnitById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.UNIT_BY_ID(id));

    return unwrapResponse(response);
  },

  createUnit: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.UNITS, payload);

    return unwrapResponse(response);
  },

  updateUnit: async (id, payload) => {
    const response = await axiosInstance.put(ENDPOINTS.UNIT_BY_ID(id), payload);

    return unwrapResponse(response);
  },

  deleteUnit: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.UNIT_BY_ID(id));

    return unwrapResponse(response);
  },
};
