import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeProcurementListParams } from "./procurementServiceUtils";

const CHANNEL_SORT_FIELDS = [
  "channelCode",
  "channelName",
  "displayOrder",
  "createdAt",
];

export const salesChannelService = {
  list: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_CHANNELS, {
      params: sanitizeProcurementListParams(params, CHANNEL_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  get: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_CHANNEL_BY_ID(id));
    return unwrapResponse(response);
  },
  create: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.PP_CHANNELS, payload);
    return unwrapResponse(response);
  },
  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PP_CHANNEL_BY_ID(id),
      payload,
    );
    return unwrapResponse(response);
  },
  patchStatus: async (id, payload) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.PP_CHANNEL_STATUS(id),
      payload,
    );
    return unwrapResponse(response);
  },
};
