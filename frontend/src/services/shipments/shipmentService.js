import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeShipmentListParams } from "../../utils/shipmentQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const shipmentService = {
  list: async (params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SO_SHIPMENTS, {
      params: normalizeParams(sanitizeShipmentListParams(params)),
      signal,
    });

    return unwrapResponse(response);
  },

  getById: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SO_SHIPMENT_BY_ID(id),
      { signal },
    );

    return unwrapResponse(response);
  },

  createManual: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_SHIPMENTS_MANUAL,
      payload,
    );

    return unwrapResponse(response);
  },

  createFromDispatchPlan: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_SHIPMENTS_FROM_DISPATCH,
      payload,
    );

    return unwrapResponse(response);
  },

  transition: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_SHIPMENT_TRANSITION(id),
      payload,
    );

    return unwrapResponse(response);
  },

  cancel: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_SHIPMENT_CANCEL(id),
      { reason },
    );

    return unwrapResponse(response);
  },
};

