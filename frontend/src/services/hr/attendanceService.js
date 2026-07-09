import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { sanitizeHrListParams } from "./hrServiceUtils";

export const hrAttendanceService = {
  getAttendance: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_ATTENDANCE, {
      params: sanitizeHrListParams(params),
    });

    return unwrapResponse(response);
  },

  getAttendanceByEmployee: async (employeeId, params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_ATTENDANCE_BY_EMPLOYEE(employeeId),
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },

  checkIn: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_ATTENDANCE_CHECKIN,
      payload,
    );

    return unwrapResponse(response);
  },

  checkOut: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_ATTENDANCE_CHECKOUT,
      payload,
    );

    return unwrapResponse(response);
  },

  createManualEntry: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_ATTENDANCE_MANUAL,
      payload,
    );

    return unwrapResponse(response);
  },

  requestAdjustment: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_ATTENDANCE_ADJUST_REQUEST,
      payload,
    );

    return unwrapResponse(response);
  },

  approveAdjustment: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_ATTENDANCE_APPROVE_ADJUST,
      payload,
    );

    return unwrapResponse(response);
  },

  rejectAdjustment: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_ATTENDANCE_REJECT_ADJUST,
      payload,
    );

    return unwrapResponse(response);
  },

  getMonthlyReport: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_ATTENDANCE_MONTHLY_REPORT,
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },

  getDepartmentReport: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_ATTENDANCE_DEPT_REPORT,
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },
};
