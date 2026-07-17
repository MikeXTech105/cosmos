import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeProcurementListParams } from "./procurementServiceUtils";

const MAPPING_SORT_FIELDS = [
  "channelCode",
  "channelSku",
  "channelProductName",
  "itemCode",
  "createdAt",
];

const UNMAPPED_SORT_FIELDS = [
  "channelCode",
  "channelSku",
  "occurrenceCount",
  "lastSeenDate",
];

export const skuMappingService = {
  list: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_SKU_MAPPINGS, {
      params: sanitizeProcurementListParams(params, MAPPING_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  unmapped: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PP_SKU_MAPPINGS_UNMAPPED,
      { params: sanitizeProcurementListParams(params, UNMAPPED_SORT_FIELDS) },
    );
    return unwrapResponse(response);
  },
  get: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PP_SKU_MAPPING_BY_ID(id),
    );
    return unwrapResponse(response);
  },
  create: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_SKU_MAPPINGS,
      payload,
    );
    return unwrapResponse(response);
  },
  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PP_SKU_MAPPING_BY_ID(id),
      payload,
    );
    return unwrapResponse(response);
  },
  patchStatus: async (id, payload) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.PP_SKU_MAPPING_STATUS(id),
      payload,
    );
    return unwrapResponse(response);
  },
};
