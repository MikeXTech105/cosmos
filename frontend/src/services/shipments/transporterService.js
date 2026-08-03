import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeShipmentTransporterParams } from "../../utils/shipmentQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const shipmentTransporterService = {
  list: async (params = {}, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SO_TRANSPORTERS, {
      params: normalizeParams(sanitizeShipmentTransporterParams(params)),
      signal,
    });

    return unwrapResponse(response);
  },

  setRole: async (partyId, isTransporter) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SO_TRANSPORTER_BY_ID(partyId),
      { isTransporter },
    );

    return unwrapResponse(response);
  },
};

