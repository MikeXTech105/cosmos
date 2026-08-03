import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeSupplyChainWarehouseDropdownParams,
  sanitizeSupplyChainWarehouseParams,
} from "../../utils/supplyChainQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const supplyChainWarehouseService = {
  list: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_WAREHOUSES, {
      params: normalizeParams(sanitizeSupplyChainWarehouseParams(params)),
    });

    return unwrapResponse(response);
  },

  dropdown: async (params = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.SC_WAREHOUSE_DROPDOWN,
      {
        params: normalizeParams(
          sanitizeSupplyChainWarehouseDropdownParams(params),
        ),
      },
    );

    return unwrapResponse(response);
  },

  getById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_WAREHOUSE_BY_ID(id));

    return unwrapResponse(response);
  },

  create: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.SC_WAREHOUSES, payload);

    return unwrapResponse(response);
  },

  update: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.SC_WAREHOUSE_BY_ID(id),
      payload,
    );

    return unwrapResponse(response);
  },

  changeStatus: async (id, isActive) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.SC_WAREHOUSE_STATUS(id),
      { isActive },
    );

    return unwrapResponse(response);
  },

  remove: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.SC_WAREHOUSE_BY_ID(id),
    );

    return unwrapResponse(response);
  },
};
