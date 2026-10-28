import exactApi from "../manufacturing/productionApi";
import { idWire } from "../../utils/productionValues";
import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const hsnGstService = {
  listHsnSacs: async (params = {}, { signal } = {}) => unwrapResponse(await exactApi.get("/api/v1/gst/hsn-sacs", { params: normalizeParams(params), signal })),
  getHsnSac: async (id, { signal } = {}) => unwrapResponse(await exactApi.get(`/api/v1/gst/hsn-sacs/${id}`, { signal })),
  saveHsnSac: async (id, payload) => unwrapResponse(await (id ? exactApi.put(`/api/v1/gst/hsn-sacs/${id}`, payload) : exactApi.post("/api/v1/gst/hsn-sacs", payload))),
  getEffectiveCategoryDefault: async (id, onDate, { signal } = {}) => unwrapResponse(await exactApi.get(`/api/v1/gst/categories/${id}/hsn-default`, { params: { onDate }, signal })),
  saveCategoryDefault: async (id, payload) => unwrapResponse(await exactApi.put(`/api/v1/gst/categories/${id}/hsn-default`, { ...payload, hsnSacId: idWire(payload.hsnSacId) })),
  retireCategoryDefault: async (id, mappingId, effectiveTo) => unwrapResponse(await exactApi.post(`/api/v1/gst/categories/${id}/hsn-default/${mappingId}/retire`, { effectiveTo })),
  saveItemOverride: async (id, payload) => unwrapResponse(await exactApi.put(`/api/v1/gst/items/${id}/hsn-override`, { ...payload, hsnSacId: idWire(payload.hsnSacId) })),
  retireItemOverride: async (id, mappingId, effectiveTo) => unwrapResponse(await exactApi.post(`/api/v1/gst/items/${id}/hsn-override/${mappingId}/retire`, { effectiveTo })),
  getEffectiveClassification: async (id, onDate, { signal } = {}) => unwrapResponse(await exactApi.get(`/api/v1/gst/items/${id}/effective-classification`, { params: { onDate }, signal })),
  listRateVersions: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.GST_RATE_VERSIONS, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  createRateVersion: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.GST_RATE_VERSIONS,
      payload,
    );

    return unwrapResponse(response);
  },

};
