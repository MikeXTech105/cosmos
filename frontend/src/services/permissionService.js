import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { unwrapResponse } from "./apiServiceUtils";

export const permissionService = {
  getRolePermissions: async (roleId) => {
    const response = await axiosInstance.get(ENDPOINTS.ROLE_PERMISSIONS(roleId));

    return unwrapResponse(response);
  },

  updateRolePermissions: async (roleId, permissions) => {
    const response = await axiosInstance.put(
      ENDPOINTS.ROLE_PERMISSIONS(roleId),
      { permissions },
    );

    return unwrapResponse(response);
  },
};
