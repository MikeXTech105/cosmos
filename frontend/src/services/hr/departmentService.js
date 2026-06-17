import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeHrListParams } from "./hrServiceUtils";

const DEPARTMENT_SORT_FIELDS = [
  "departmentCode",
  "departmentName",
  "createdAt",
];

export const hrDepartmentService = {
  getDepartments: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_DEPARTMENTS, {
      params: sanitizeHrListParams(params, DEPARTMENT_SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getDepartmentById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_DEPARTMENT_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  createDepartment: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_DEPARTMENTS,
      payload,
    );

    return unwrapResponse(response);
  },

  updateDepartment: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.HR_DEPARTMENT_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteDepartment: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.HR_DEPARTMENT_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
