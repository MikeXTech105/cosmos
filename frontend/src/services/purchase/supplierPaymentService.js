import axiosInstance from "../manufacturing/productionApi";
import { wireFinancialEntry } from "../../utils/financialEntry";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizePurchaseListParams } from "./purchaseServiceUtils";

const SORT_FIELDS = ["paymentDate", "amount", "supplierName"];

export const supplierPaymentService = {
  getSupplierPayments: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.SUPPLIER_PAYMENTS, {
      params: sanitizePurchaseListParams(params, SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getSupplierPaymentById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SUPPLIER_PAYMENT_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  createSupplierPayment: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SUPPLIER_PAYMENTS,
      wireFinancialEntry(payload),
    );

    return unwrapResponse(response);
  },

  updateSupplierPayment: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SUPPLIER_PAYMENT_BY_ID(id),
      wireFinancialEntry(payload),
    );

    return unwrapResponse(response);
  },

  deleteSupplierPayment: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.SUPPLIER_PAYMENT_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
