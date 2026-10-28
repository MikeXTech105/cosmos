import axiosInstance from "../manufacturing/productionApi";
import { ENDPOINTS } from "../../api/endpoints";
import {
  sanitizeDispatchRecommendationParams,
  sanitizeDispatchRunParams,
} from "../../utils/dispatchQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

export const dispatchRunService = {
  list: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.DP_RUNS, {
      params: normalizeParams(sanitizeDispatchRunParams(params)),
    });
    return unwrapResponse(response);
  },
  create: async (payload) => {
    const response = await axiosInstance.post(ENDPOINTS.DP_RUNS, payload);
    return unwrapResponse(response);
  },
  getById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.DP_RUN_BY_ID(id));
    return unwrapResponse(response);
  },
  calculate: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_RUN_CALCULATE(id),
    );
    return unwrapResponse(response);
  },
  recommendations: async (id, params = {}) => {
    const response = await axiosInstance.get(
      ENDPOINTS.DP_RUN_RECOMMENDATIONS(id),
      {
        params: normalizeParams(
          sanitizeDispatchRecommendationParams(params),
        ),
      },
    );
    return unwrapResponse(response);
  },
  updateRecommendation: async (runId, recommendationId, payload) => {
    const response = await axiosInstance.patch(
      ENDPOINTS.DP_RUN_RECOMMENDATION(runId, recommendationId),
      payload,
    );
    return unwrapResponse(response);
  },
  allocate: async (id, notes) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_RUN_ALLOCATE(id),
      { notes },
    );
    return unwrapResponse(response);
  },
  finalize: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_RUN_FINALIZE(id),
    );
    return unwrapResponse(response);
  },
  cancel: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.DP_RUN_CANCEL(id),
      { reason },
    );
    return unwrapResponse(response);
  },
};
