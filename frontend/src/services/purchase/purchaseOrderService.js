import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizePurchaseListParams } from "./purchaseServiceUtils";

const SORT_FIELDS = ["orderDate", "expectedDeliveryDate", "supplierName"];

export const purchaseOrderService = {
  getPurchaseOrders: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PURCHASE_ORDERS, {
      params: sanitizePurchaseListParams(params, SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getPurchaseOrderById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.PURCHASE_ORDER_BY_ID(id));

    return unwrapResponse(response);
  },

  createPurchaseOrder: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_ORDERS,
      payload,
    );

    return unwrapResponse(response);
  },

  updatePurchaseOrder: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PURCHASE_ORDER_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deletePurchaseOrder: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.PURCHASE_ORDER_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  cancelPurchaseOrder: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_ORDER_CANCEL(id),
    );

    return unwrapResponse(response);
  },

  convertToBill: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PURCHASE_ORDER_CONVERT_TO_BILL(id),
      payload,
    );

    return unwrapResponse(response);
  },
};
