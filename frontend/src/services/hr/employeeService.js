import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";
import { sanitizeHrListParams } from "./hrServiceUtils";

const EMPLOYEE_SORT_FIELDS = [
  "employeeCode",
  "firstName",
  "lastName",
  "createdAt",
];

export const hrEmployeeService = {
  getEmployees: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_EMPLOYEES, {
      params: sanitizeHrListParams(params, EMPLOYEE_SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getEmployeeById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_EMPLOYEE_BY_ID(id));

    return unwrapResponse(response);
  },

  createEmployee: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_EMPLOYEES,
      payload,
    );

    return unwrapResponse(response);
  },

  updateEmployee: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.HR_EMPLOYEE_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteEmployee: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.HR_EMPLOYEE_BY_ID(id),
    );

    return unwrapResponse(response);
  },

  getEmployeeDropdown: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_EMPLOYEE_DROPDOWN, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  getReportingManagers: async (params) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_EMPLOYEE_REPORTING_MANAGERS,
      { params: normalizeParams(params) },
    );

    return unwrapResponse(response);
  },

  getDocuments: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_EMPLOYEE_DOCUMENTS(id),
    );

    return unwrapResponse(response);
  },

  addDocument: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_EMPLOYEE_DOCUMENTS(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteDocument: async (documentId) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.HR_EMPLOYEE_DOCUMENT_BY_ID(documentId),
    );

    return unwrapResponse(response);
  },

  getBankDetails: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.HR_EMPLOYEE_BANK_DETAILS(id),
    );

    return unwrapResponse(response);
  },

  saveBankDetails: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.HR_EMPLOYEE_BANK_DETAILS(id),
      payload,
    );

    return unwrapResponse(response);
  },
};
