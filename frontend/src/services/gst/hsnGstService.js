import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const hsnGstService = {
  listHsnSac: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.GST_HSN_SAC, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  getHsnSac: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.GST_HSN_SAC_BY_ID(id));

    return unwrapResponse(response);
  },

  createHsnSac: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.GST_HSN_SAC, payload);

    return unwrapResponse(response);
  },

  updateHsnSac: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.GST_HSN_SAC_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  listRateVersions: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.GST_RATE_VERSIONS, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  createRateVersion: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.GST_RATE_VERSIONS,
      payload,
    );

    return unwrapResponse(response);
  },

  saveCategoryDefault: async (categoryId, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.GST_CATEGORY_HSN_DEFAULT(categoryId),
      payload,
    );

    return unwrapResponse(response);
  },

  getEffectiveCategoryDefault: async (categoryId, onDate) => {
    const response = await axiosInstance.get(
      ENDPOINTS.GST_CATEGORY_HSN_DEFAULT(categoryId),
      { params: normalizeParams({ onDate }) },
    );

    return unwrapResponse(response);
  },

  retireCategoryDefault: async (categoryId, mappingId, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.GST_CATEGORY_HSN_DEFAULT_RETIRE(categoryId, mappingId),
      payload,
    );

    return unwrapResponse(response);
  },

  saveItemOverride: async (itemId, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.GST_ITEM_HSN_OVERRIDE(itemId),
      payload,
    );

    return unwrapResponse(response);
  },

  retireItemOverride: async (itemId, mappingId, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.GST_ITEM_HSN_OVERRIDE_RETIRE(itemId, mappingId),
      payload,
    );

    return unwrapResponse(response);
  },

  getEffectiveClassification: async (itemId, onDate) => {
    const response = await axiosInstance.get(
      ENDPOINTS.GST_ITEM_EFFECTIVE_CLASSIFICATION(itemId),
      { params: normalizeParams({ onDate }) },
    );

    return unwrapResponse(response);
  },
};
