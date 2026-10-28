import axiosInstance from "../../api/axios";
import exactApi from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const UNIT_SORT_FIELDS = ["name", "createdAt"];

export const unitService = {
  getUnits: async (params, { signal } = {}) => {
    const response = await exactApi.get(ENDPOINTS.UNITS, {
      signal,
      params: normalizeParams(
        sanitizeInventoryListParams(params, UNIT_SORT_FIELDS),
      ),
    });

    return unwrapResponse(response);
  },

  getUnitById: async (id, { signal } = {}) => {
    const response = await exactApi.get(ENDPOINTS.UNIT_BY_ID(id), { signal });

    return unwrapResponse(response);
  },

  createUnit: async (payload) => {
    const response = await exactApi.post(ENDPOINTS.UNITS, payload);

    return unwrapResponse(response);
  },

  updateUnit: async (id, payload) => {
    const response = await exactApi.put(ENDPOINTS.UNIT_BY_ID(id), payload);

    return unwrapResponse(response);
  },

  deleteUnit: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.UNIT_BY_ID(id));

    return unwrapResponse(response);
  },
};
