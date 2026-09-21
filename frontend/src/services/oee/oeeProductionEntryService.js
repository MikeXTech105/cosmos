import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeOeeListParams } from "./oeeServiceUtils";

const PRODUCTION_ENTRY_SORT_FIELDS = [
  "productionDate",
  "machineName",
  "mouldName",
  "shotCount",
  "calculatedOeePercentage",
  "createdAt",
];

export const oeeProductionEntryService = {
  getProductionEntries: async (params, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.OEE_PRODUCTION_ENTRIES,
      {
        signal,
        params: sanitizeOeeListParams(
          params,
          PRODUCTION_ENTRY_SORT_FIELDS,
        ),
      },
    );

    return unwrapResponse(response);
  },

  getProductionEntryById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.OEE_PRODUCTION_ENTRY_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  createProductionEntriesBulk: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.OEE_PRODUCTION_ENTRIES_BULK,
      payload,
    );

    return unwrapResponse(response);
  },

  updateProductionEntry: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.OEE_PRODUCTION_ENTRY_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteProductionEntry: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.OEE_PRODUCTION_ENTRY_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
