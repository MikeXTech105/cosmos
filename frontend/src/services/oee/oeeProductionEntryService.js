import axiosInstance from "../manufacturing/productionApi";
import { idWire } from "../../utils/productionValues";
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
const wireEntry = payload => ({ ...payload, ...(payload.entries ? { entries: payload.entries.map(wireEntry) } : {}),
  ...Object.fromEntries(["machineId", "mouldId", "downtimeReasonId"].filter(key => payload[key] != null && payload[key] !== "").map(key => [key, idWire(payload[key])])) });

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
      wireEntry(payload),
    );

    return unwrapResponse(response);
  },

  updateProductionEntry: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.OEE_PRODUCTION_ENTRY_BY_ID(id),
      wireEntry(payload),
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
