import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeSupplyChainPackagingParams } from "../../utils/supplyChainQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const supplyChainPackagingProfileService = {
  list: async (params = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SC_PACKAGING_PROFILES,
      {
        params: normalizeParams(sanitizeSupplyChainPackagingParams(params)),
      },
    );

    return unwrapResponse(response);
  },

  getById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SC_PACKAGING_PROFILE_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  create: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SC_PACKAGING_PROFILES,
      payload,
    );

    return unwrapResponse(response);
  },

  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SC_PACKAGING_PROFILE_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  setDefault: async (id) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.SC_PACKAGING_PROFILE_SET_DEFAULT(id),
    );

    return unwrapResponse(response);
  },

  remove: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.SC_PACKAGING_PROFILE_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
