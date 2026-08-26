import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeRojmelListParams } from "../../utils/rojmelQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const TRANSFER_SORT_FIELDS = ["transferDate", "createdAt", "amount"];

export const transferService = {
  getTransfers: async (params, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.ROJMEL_TRANSFERS, {
      params: normalizeParams(
        sanitizeRojmelListParams(params, TRANSFER_SORT_FIELDS),
      ),
      signal,
    });

    return unwrapResponse(response);
  },

  getTransferById: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.ROJMEL_TRANSFER_BY_ID(id),
      { signal },
    );

    return unwrapResponse(response);
  },

  createTransfer: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_TRANSFERS,
      payload,
    );

    return unwrapResponse(response);
  },

  cancelTransfer: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_TRANSFER_CANCEL(id),
      { reason },
    );

    return unwrapResponse(response);
  },
};
