import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeSupplyChainChannelParams } from "../../utils/supplyChainQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const supplyChainChannelService = {
  list: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_CHANNELS, {
      params: normalizeParams(sanitizeSupplyChainChannelParams(params)),
    });

    return unwrapResponse(response);
  },

  getById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_CHANNEL_BY_ID(id));

    return unwrapResponse(response);
  },

  create: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.SC_CHANNELS, payload);

    return unwrapResponse(response);
  },

  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SC_CHANNEL_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  changeStatus: async (id, isActive) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.SC_CHANNEL_STATUS(id),
      { isActive },
    );

    return unwrapResponse(response);
  },

  remove: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.SC_CHANNEL_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
