import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { hrCommandIds } from "./hrServiceUtils";

export const hrPayrollService = {
  processPayroll: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_PAYROLL_PROCESS,
      hrCommandIds({ ...payload, rateSelections: (payload.rateSelections || []).map((selection) => hrCommandIds(selection)) }),
    );

    return unwrapResponse(response);
  },

  approvePayroll: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_PAYROLL_APPROVE,
      hrCommandIds(payload),
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
