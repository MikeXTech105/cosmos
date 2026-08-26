import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";

const post = async (endpoint, payload) => {
  const response = await axiosInstance.post(endpoint, payload);
  return unwrapResponse(response);
};

export const shipmentActivityService = {
  saveDocket: (shipmentId, payload) =>
    post(ENDPOINTS.SO_DOCKETS(shipmentId), payload),

  saveAppointment: (shipmentId, payload) =>
    post(ENDPOINTS.SO_APPOINTMENTS(shipmentId), payload),

  addTrackingEvent: (shipmentId, payload) =>
    post(ENDPOINTS.SO_TRACKING_EVENTS(shipmentId), payload),

  addDeliveryAttempt: (shipmentId, payload) =>
    post(ENDPOINTS.SO_DELIVERY_ATTEMPTS(shipmentId), payload),

  createReceipt: (shipmentId, payload) =>
    post(ENDPOINTS.SO_RECEIPTS(shipmentId), payload),

  createReturn: (shipmentId, payload) =>
    post(ENDPOINTS.SO_RETURNS(shipmentId), payload),

  receiveReturn: (returnId, payload) =>
    post(ENDPOINTS.SO_RETURN_RECEIVE(returnId), payload),
};

