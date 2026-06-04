import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { normalizeParams, unwrapResponse } from "./apiServiceUtils";

export const roleService = {
  getRoles: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.ROLES, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },
};
