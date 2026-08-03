import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";

const post = async (endpoint, payload) => {
  const response =
    payload === undefined
      ? await axiosInstance.post(endpoint)
      : await axiosInstance.post(endpoint, payload);

  return unwrapResponse(response);
};

export const shipmentFreightService = {
  save: (shipmentId, payload) =>
    post(ENDPOINTS.SO_FREIGHT_CHARGES(shipmentId), payload),

  submit: (id) => post(ENDPOINTS.SO_FREIGHT_SUBMIT(id)),

  approve: (id, payload) =>
    post(ENDPOINTS.SO_FREIGHT_APPROVE(id), payload),

  reject: (id, payload) =>
    post(ENDPOINTS.SO_FREIGHT_REJECT(id), payload),

  markPaid: (id, payload) =>
    post(ENDPOINTS.SO_FREIGHT_MARK_PAID(id), payload),

  postToRojmel: (id, payload) =>
    post(ENDPOINTS.SO_FREIGHT_ROJMEL_EXPENSE(id), payload),
};

