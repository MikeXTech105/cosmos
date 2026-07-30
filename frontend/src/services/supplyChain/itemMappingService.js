import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeSupplyChainItemMappingParams } from "../../utils/supplyChainQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const supplyChainItemMappingService = {
  list: async (params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_ITEM_MAPPINGS, {
      params: normalizeParams(sanitizeSupplyChainItemMappingParams(params)),
      ...(signal ? { signal } : {}),
    });

    return unwrapResponse(response);
  },

  unmatched: async () => {
    const response = await axiosInstance.get(
      ENDPOINTS.SC_ITEM_MAPPINGS_UNMATCHED,
    );

    return unwrapResponse(response);
  },

  getById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SC_ITEM_MAPPING_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  create: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SC_ITEM_MAPPINGS,
      payload,
    );

    return unwrapResponse(response);
  },

  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SC_ITEM_MAPPING_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  changeStatus: async (id, isActive) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.SC_ITEM_MAPPING_STATUS(id),
      { isActive },
    );

    return unwrapResponse(response);
  },

  remove: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.SC_ITEM_MAPPING_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
