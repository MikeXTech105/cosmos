import axiosInstance from "../../api/axios";
import productionApi from "../manufacturing/productionApi";
import { decimalWire } from "../../utils/productionValues";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import {
  downloadFile,
  sanitizeProcurementListParams,
} from "./procurementServiceUtils";

const RUN_SORT_FIELDS = [
  "runNumber",
  "fromDate",
  "toDate",
  "status",
  "calculatedAt",
];
const LINE_SORT_FIELDS = [
  "itemCode",
  "itemName",
  "shortage",
  "finalQuantity",
];

export const planningService = {
  validate: async (payload) => {
    const response = await productionApi.post(
      ENDPOINTS.PP_PLAN_VALIDATE,
      payload,
    );
    return unwrapResponse(response);
  },
  preview: async (payload) => {
    const response = await productionApi.post(
      ENDPOINTS.PP_PLAN_PREVIEW,
      payload,
    );
    return unwrapResponse(response);
  },
  saveRun: async (payload) => {
    const response = await productionApi.post(ENDPOINTS.PP_PLAN_RUNS, payload);
    return unwrapResponse(response);
  },
  listRuns: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_PLAN_RUNS, {
      params: sanitizeProcurementListParams(params, RUN_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  getRun: async (id) => {
    const response = await productionApi.get(ENDPOINTS.PP_PLAN_RUN_BY_ID(id));
    return unwrapResponse(response);
  },
  getRunLines: async (id, params) => {
    const response = await productionApi.get(ENDPOINTS.PP_PLAN_RUN_LINES(id), {
      params: sanitizeProcurementListParams(params, LINE_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  adjustLine: async (runId, lineId, payload) => {
    const response = await productionApi.patch(
      ENDPOINTS.PP_PLAN_RUN_LINE(runId, lineId),
      { ...payload, finalQuantity: decimalWire(payload.finalQuantity) },
    );
    return unwrapResponse(response);
  },
  finalize: async (id) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_PLAN_RUN_FINALIZE(id),
    );
    return unwrapResponse(response);
  },
  cancel: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_PLAN_RUN_CANCEL(id),
      { reason },
    );
    return unwrapResponse(response);
  },
  exportRun: (id) =>
    downloadFile(axiosInstance, {
      fallbackFilename: `procurement-plan-${id}.xlsx`,
      url: ENDPOINTS.PP_PLAN_RUN_EXPORT(id),
    }),
};
