import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const roleService = {
  getRoles: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.ROLES, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  getRoleById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.ROLE_BY_ID(id));

    return unwrapResponse(response);
  },

  createRole: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.ROLES, payload);

    return unwrapResponse(response);
  },

  updateRole: async (id, payload) => {
    const response = await axiosInstance.put(ENDPOINTS.ROLE_BY_ID(id), payload);

    return unwrapResponse(response);
  },

  deleteRole: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.ROLE_BY_ID(id));

    return unwrapResponse(response);
  },
};
