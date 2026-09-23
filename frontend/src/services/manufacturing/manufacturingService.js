import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const manufacturingBomService = {
  list: async (params = {}, { signal } = {}) => unwrapResponse(await axiosInstance.get(
    ENDPOINTS.MANUFACTURING_BOMS,
    { params: normalizeParams(params), signal },
  )),
  getById: async (id) => unwrapResponse(await axiosInstance.get(
    ENDPOINTS.MANUFACTURING_BOM_BY_ID(id),
  )),
  create: async (payload) => unwrapResponse(await axiosInstance.post(
    ENDPOINTS.MANUFACTURING_BOMS,
    payload,
  )),
  update: async (id, payload) => unwrapResponse(await axiosInstance.put(
    ENDPOINTS.MANUFACTURING_BOM_BY_ID(id),
    payload,
  )),
  activate: async (id) => unwrapResponse(await axiosInstance.post(
    ENDPOINTS.MANUFACTURING_BOM_ACTIVATE(id),
  )),
  deactivate: async (id) => unwrapResponse(await axiosInstance.post(
    ENDPOINTS.MANUFACTURING_BOM_DEACTIVATE(id),
  )),
  remove: async (id) => unwrapResponse(await axiosInstance.delete(
    ENDPOINTS.MANUFACTURING_BOM_BY_ID(id),
  )),
};

export const manufacturingProductionService = {
  list: async (params = {}, { signal } = {}) => unwrapResponse(await axiosInstance.get(
    ENDPOINTS.MANUFACTURING_PRODUCTIONS,
    { params: normalizeParams(params), signal },
  )),
  getById: async (id) => unwrapResponse(await axiosInstance.get(
    ENDPOINTS.MANUFACTURING_PRODUCTION_BY_ID(id),
  )),
  create: async (payload) => unwrapResponse(await axiosInstance.post(
    ENDPOINTS.MANUFACTURING_PRODUCTIONS,
    payload,
  )),
  update: async (id, payload) => unwrapResponse(await axiosInstance.put(
    ENDPOINTS.MANUFACTURING_PRODUCTION_BY_ID(id),
    payload,
  )),
  post: async (id) => unwrapResponse(await axiosInstance.post(
    ENDPOINTS.MANUFACTURING_PRODUCTION_POST(id),
  )),
  cancel: async (id, reason) => unwrapResponse(await axiosInstance.post(
    ENDPOINTS.MANUFACTURING_PRODUCTION_CANCEL(id),
    { reason },
  )),
};
