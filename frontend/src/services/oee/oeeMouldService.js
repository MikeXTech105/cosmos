import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeOeeListParams } from "./oeeServiceUtils";

const MOULD_SORT_FIELDS = [
  "mouldName",
  "targetShotPerDay",
  "createdAt",
];

export const oeeMouldService = {
  getMoulds: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.OEE_MOULDS, {
      params: sanitizeOeeListParams(params, MOULD_SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getMouldById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.OEE_MOULD_BY_ID(id));

    return unwrapResponse(response);
  },

  createMould: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.OEE_MOULDS,
      payload,
    );

    return unwrapResponse(response);
  },

  updateMould: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.OEE_MOULD_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteMould: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.OEE_MOULD_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
