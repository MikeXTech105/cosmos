import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { hrCommandIds, sanitizeHrListParams } from "./hrServiceUtils";

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
      hrCommandIds(payload),
    );

    return unwrapResponse(response);
  },

  cancelLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_CANCEL,
      hrCommandIds(payload),
    );

    return unwrapResponse(response);
  },

  approveLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_APPROVE,
      hrCommandIds(payload),
    );

    return unwrapResponse(response);
  },

  rejectLeave: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_LEAVES_REJECT,
      hrCommandIds(payload),
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
