import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizePurchaseListParams } from "./purchaseServiceUtils";

const SORT_FIELDS = ["billDate", "dueDate", "supplierName", "grandTotal"];

export const purchaseBillService = {
  getPurchaseBills: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PURCHASE_BILLS, {
      params: sanitizePurchaseListParams(params, SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getPurchaseBillById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.PURCHASE_BILL_BY_ID(id));

    return unwrapResponse(response);
  },

  getPurchaseBillsBySupplier: async (supplierId, params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PURCHASE_BILL_BY_SUPPLIER(supplierId),
      {
        params: sanitizePurchaseListParams(params, SORT_FIELDS),
      },
    );

    return unwrapResponse(response);
  },

  createPurchaseBill: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_BILLS,
      payload,
    );

    return unwrapResponse(response);
  },

  updatePurchaseBill: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PURCHASE_BILL_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deletePurchaseBill: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.PURCHASE_BILL_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  confirmPurchaseBill: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_BILL_CONFIRM(id),
    );

    return unwrapResponse(response);
  },

  cancelPurchaseBill: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_BILL_CANCEL(id),
    );

    return unwrapResponse(response);
  },
};
