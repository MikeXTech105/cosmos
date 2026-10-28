import axiosInstance from "../manufacturing/productionApi";
import { wireDocumentQuantities } from "../../utils/documentPrecision";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizePurchaseListParams } from "./purchaseServiceUtils";

const SORT_FIELDS = ["returnDate", "supplierName", "grandTotal"];

export const purchaseReturnService = {
  getPurchaseReturns: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PURCHASE_RETURNS, {
      params: sanitizePurchaseListParams(params, SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getPurchaseReturnById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.PURCHASE_RETURN_BY_ID(id));

    return unwrapResponse(response);
  },

  createPurchaseReturn: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_RETURNS,
      wireDocumentQuantities(payload),
    );

    return unwrapResponse(response);
  },

  updatePurchaseReturn: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PURCHASE_RETURN_BY_ID(id),
      wireDocumentQuantities(payload),
    );

    return unwrapResponse(response);
  },

  deletePurchaseReturn: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.PURCHASE_RETURN_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
