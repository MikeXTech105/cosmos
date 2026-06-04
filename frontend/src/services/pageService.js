import axiosInstance from "../api/axios";
import { ENDPOINTS } from "../api/endpoints";
import { normalizeParams, unwrapResponse } from "./apiServiceUtils";

export const pageService = {
  getPages: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PAGES, {
      params: normalizeParams(params),
    });

    return unwrapResponse(response);
  },

  getPageById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.PAGE_BY_ID(id));

    return unwrapResponse(response);
  },

  createPage: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.PAGES, payload);

    return unwrapResponse(response);
  },

  updatePage: async (id, payload) => {
    const response = await axiosInstance.put(ENDPOINTS.PAGE_BY_ID(id), payload);

    return unwrapResponse(response);
  },

  deletePage: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.PAGE_BY_ID(id));

    return unwrapResponse(response);
  },
};
