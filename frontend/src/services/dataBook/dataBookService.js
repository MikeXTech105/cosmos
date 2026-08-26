import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeDataBookExportParams,
  sanitizeDataBookListParams,
} from "../../utils/dataBookQuery";
import { normalizeDataBookHistoryPayload } from "../../utils/dataBookHistory";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const dataBookService = {
  createEntry: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DATA_BOOK_ENTRIES,
      payload,
    );
    return unwrapResponse(response);
  },

  deleteEntry: async (id, rowVersion) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.DATA_BOOK_ENTRY_BY_ID(id),
      { data: { rowVersion } },
    );
    return unwrapResponse(response);
  },

  exportEntries: (params) => {
    return axiosInstance.get(ENDPOINTS.DATA_BOOK_ENTRIES_EXPORT, {
      params: normalizeParams(sanitizeDataBookExportParams(params)),
      responseType: "blob",
    });
  },

  getEntries: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.DATA_BOOK_ENTRIES, {
      params: normalizeParams(sanitizeDataBookListParams(params)),
    });
    return unwrapResponse(response);
  },

  getEntryById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.DATA_BOOK_ENTRY_BY_ID(id),
    );
    return unwrapResponse(response);
  },

  getEntryHistory: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.DATA_BOOK_ENTRY_HISTORY(id),
    );
    const result = unwrapResponse(response);
    return {
      ...result,
      data: normalizeDataBookHistoryPayload(result.data),
    };
  },

  updateEntry: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.DATA_BOOK_ENTRY_BY_ID(id),
      payload,
    );
    return unwrapResponse(response);
  },
};
