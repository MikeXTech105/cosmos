import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeOeeListParams } from "./oeeServiceUtils";

const MACHINE_SORT_FIELDS = [
  "machineCode",
  "machineName",
  "displayOrder",
  "createdAt",
];

export const oeeMachineService = {
  getMachines: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.OEE_MACHINES, {
      params: sanitizeOeeListParams(params, MACHINE_SORT_FIELDS),
    });

    return unwrapResponse(response);
  },

  getMachineById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.OEE_MACHINE_BY_ID(id));

    return unwrapResponse(response);
  },

  createMachine: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.OEE_MACHINES,
      payload,
    );

    return unwrapResponse(response);
  },

  updateMachine: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.OEE_MACHINE_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  deleteMachine: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.OEE_MACHINE_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
