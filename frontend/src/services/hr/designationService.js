import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeHrListParams } from "./hrServiceUtils";

const DESIGNATION_SORT_FIELDS = [
  "designationCode",
  "designationName",
  "createdAt",
];

export const hrDesignationService = {
  getDesignations: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_DESIGNATIONS, {
      params: sanitizeHrListParams(params, DESIGNATION_SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getDesignationById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_DESIGNATION_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  createDesignation: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_DESIGNATIONS,
      payload,
    );

    return unwrapResponse(response);
  },

  updateDesignation: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.HR_DESIGNATION_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteDesignation: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.HR_DESIGNATION_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
