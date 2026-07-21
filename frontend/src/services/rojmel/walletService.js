import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeRojmelListParams } from "../../utils/rojmelQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const WALLET_SORT_FIELDS = ["walletName", "createdAt"];

export const walletService = {
  getWallets: async (params, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.ROJMEL_WALLETS, {
      params: normalizeParams(
        sanitizeRojmelListParams(params, WALLET_SORT_FIELDS),
      ),
      signal,
    });

    return unwrapResponse(response);
  },

  getWalletById: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.ROJMEL_WALLET_BY_ID(id),
      { signal },
    );

    return unwrapResponse(response);
  },

  getWalletBalance: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.ROJMEL_WALLET_BALANCE(id),
      { signal },
    );

    return unwrapResponse(response);
  },

  createWallet: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ROJMEL_WALLETS,
      payload,
    );

    return unwrapResponse(response);
  },

  updateWallet: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.ROJMEL_WALLET_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  changeWalletStatus: async (id, isActive) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.ROJMEL_WALLET_STATUS(id),
      { isActive },
    );

    return unwrapResponse(response);
  },
};
