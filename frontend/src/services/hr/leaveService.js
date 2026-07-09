import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeHrListParams } from "./hrServiceUtils";

export const hrLeaveService = {
  getLeaves: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_LEAVES, {
      params: sanitizeHrListParams(params),
    });

    return unwrapResponse(response);
  },

  applyLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_APPLY,
      payload,
    );

    return unwrapResponse(response);
  },

  cancelLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_CANCEL,
      payload,
    );

    return unwrapResponse(response);
  },

  approveLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_APPROVE,
      payload,
    );

    return unwrapResponse(response);
  },

  rejectLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_REJECT,
      payload,
    );

    return unwrapResponse(response);
  },

  getLeaveBalance: async (employeeId) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_LEAVES_BALANCE(employeeId),
    );

    return unwrapResponse(response);
  },

  getPendingApprovals: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_LEAVES_PENDING, {
      params: sanitizeHrListParams(params),
    });

    return unwrapResponse(response);
  },
};
