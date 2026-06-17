import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const hrPayrollService = {
  processPayroll: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_PAYROLL_PROCESS,
      payload,
    );

    return unwrapResponse(response);
  },

  approvePayroll: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_PAYROLL_APPROVE,
      payload,
    );

    return unwrapResponse(response);
  },

  getPayrollRunById: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_PAYROLL_RUN_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  getPayrollHistory: async (employeeId) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_PAYROLL_HISTORY(employeeId),
    );

    return unwrapResponse(response);
  },

  getPayslip: async (employeeId, params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_PAYROLL_PAYSLIP(employeeId),
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },
};
