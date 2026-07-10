import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../../services/apiServiceUtils";

export const gstService = {
  verifyGstin: async ({ forceRefresh = false, gstin }) => {
    const response = await axiosInstance.post(ENDPOINTS.GST_VERIFY_GSTIN, {
      gstin,
      forceRefresh,
    });

    return unwrapResponse(response);
  },

  getGstConfigStatus: async () => {
    const response = await axiosInstance.get(ENDPOINTS.GST_CONFIG_STATUS);

    return unwrapResponse(response);
  },
};
