import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeProcurementListParams } from "./procurementServiceUtils";

const SETTING_SORT_FIELDS = [
  "itemCode",
  "itemName",
  "effectiveLeadTimeDays",
  "createdAt",
];
const HISTORY_SORT_FIELDS = ["orderedDate", "receivedDate", "createdAt"];

export const procurementSettingService = {
  list: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_SETTINGS, {
      params: sanitizeProcurementListParams(params, SETTING_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  getByItem: async (itemId) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PP_SETTING_BY_ITEM(itemId),
    );
    return unwrapResponse(response);
  },
  saveByItem: async (itemId, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PP_SETTING_BY_ITEM(itemId),
      payload,
    );
    return unwrapResponse(response);
  },
  getMissing: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_SETTINGS_MISSING, {
      params: sanitizeProcurementListParams(params, SETTING_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  addLeadTimeHistory: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_LEAD_TIME_HISTORY,
      payload,
    );
    return unwrapResponse(response);
  },
  getLeadTimeHistory: async (itemId, params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PP_LEAD_TIME_HISTORY_BY_ITEM(itemId),
      { params: sanitizeProcurementListParams(params, HISTORY_SORT_FIELDS) },
    );
    return unwrapResponse(response);
  },
};
