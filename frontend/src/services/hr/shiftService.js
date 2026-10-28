import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeHrListParams } from "./hrServiceUtils";

const SHIFT_SORT_FIELDS = ["shiftCode", "shiftName", "createdAt"];

export const hrShiftService = {
  getShifts: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_SHIFTS, {
      params: sanitizeHrListParams(params, SHIFT_SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getShiftById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.HR_SHIFT_BY_ID(id));

    return unwrapResponse(response);
  },

  createShift: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.HR_SHIFTS, payload);

    return unwrapResponse(response);
  },

  updateShift: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.HR_SHIFT_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteShift: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.HR_SHIFT_BY_ID(id));

    return unwrapResponse(response);
  },
};
