import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../../services/apiServiceUtils";

export const partyService = {
  getParties: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PARTIES, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  createParty: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.PARTIES, payload);

    return unwrapResponse(response);
  },

  getPartyById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.PARTY_BY_ID(id));

    return unwrapResponse(response);
  },

  updateParty: async (id, payload) => {
    const response = await axiosInstance.put(ENDPOINTS.PARTY_BY_ID(id), payload);

    return unwrapResponse(response);
  },

  deleteParty: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.PARTY_BY_ID(id));

    return unwrapResponse(response);
  },

  changePartyStatus: async (id, payload) => {
    const response = await axiosInstance.patch(ENDPOINTS.PARTY_STATUS(id), payload);

    return unwrapResponse(response);
  },

  getPartySettings: async () => {
    const response = await axiosInstance.get(ENDPOINTS.PARTY_SETTINGS);

    return unwrapResponse(response);
  },

  updatePartySettings: async (payload) => {
    const response = await axiosInstance.put(ENDPOINTS.PARTY_SETTINGS, payload);

    return unwrapResponse(response);
  },
};
