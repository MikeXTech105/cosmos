import axiosInstance from "../manufacturing/productionApi";
import { wireShipmentPayload } from "./shipmentWire";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeShipmentPackingParams } from "../../utils/shipmentQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const shipmentPackingService = {
  removePackage: async (shipmentId, packageId, payload) => unwrapResponse(await axiosInstance.post(
    `${ENDPOINTS.SO_PACKAGES(shipmentId)}/${encodeURIComponent(packageId)}/remove`, payload,
  )),
  getSuggestions: async (shipmentId, params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SO_PACKING_SUGGESTIONS(shipmentId),
      {
        params: normalizeParams(sanitizeShipmentPackingParams(params)),
        signal,
      },
    );

    return unwrapResponse(response);
  },

  savePackage: async (shipmentId, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SO_PACKAGES(shipmentId),
      wireShipmentPayload(payload),
    );

    return unwrapResponse(response);
  },
};

