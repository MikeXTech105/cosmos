import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeOeeListParams } from "./oeeServiceUtils";

const DOWNTIME_REASON_SORT_FIELDS = ["reasonName", "createdAt"];

export const oeeDowntimeReasonService = {
  getDowntimeReasons: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.OEE_DOWNTIME_REASONS,
      {
        params: sanitizeOeeListParams(
          params,
          DOWNTIME_REASON_SORT_FIELDS,
        ),
      },
    );

    return unwrapResponse(response);
  },

  getDowntimeReasonById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.OEE_DOWNTIME_REASON_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  createDowntimeReason: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.OEE_DOWNTIME_REASONS,
      payload,
    );

    return unwrapResponse(response);
  },

  updateDowntimeReason: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.OEE_DOWNTIME_REASON_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteDowntimeReason: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.OEE_DOWNTIME_REASON_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
