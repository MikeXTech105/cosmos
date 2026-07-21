import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const normalizeRoleIds = (roleIds = []) => {
  return roleIds.map((roleId) => Number(roleId)).filter(Number.isFinite);
};

export const userService = {
  getUsers: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.USERS, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  exportUsers: async (params, { signal } = {}) => {
    return axiosInstance.get(ENDPOINTS.USERS_EXPORT, {
      params: normalizeParams(params),
      responseType: "blob",
      signal,
    });
  },

  getUserById: async (id, { signal } = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.USER_BY_ID(id), {
      signal,
    });

    return unwrapResponse(response);
  },

  createUser: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.USERS, payload);

    return unwrapResponse(response);
  },

  updateUser: async (id, payload) => {
    const response = await axiosInstance.put(ENDPOINTS.USER_BY_ID(id), payload);

    return unwrapResponse(response);
  },

  deleteUser: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.USER_BY_ID(id));

    return unwrapResponse(response);
  },

  activateUser: async (id) => {
    const response = await axiosInstance.patch(ENDPOINTS.USER_ACTIVATE(id));

    return unwrapResponse(response);
  },

  deactivateUser: async (id) => {
    const response = await axiosInstance.patch(ENDPOINTS.USER_DEACTIVATE(id));

    return unwrapResponse(response);
  },

  assignRoles: async (id, roleIds) => {
    const response = await axiosInstance.post(ENDPOINTS.USER_ROLES(id), {
      roleIds: normalizeRoleIds(roleIds),
    });

    return unwrapResponse(response);
  },
};
