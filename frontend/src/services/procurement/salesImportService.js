import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import {
  downloadFile,
  sanitizeProcurementListParams,
  sanitizeProcurementParams,
} from "./procurementServiceUtils";

const BATCH_SORT_FIELDS = [
  "fileName",
  "status",
  "importedAt",
  "createdAt",
];
const HISTORY_SORT_FIELDS = [
  "salesDate",
  "channelCode",
  "channelSku",
  "itemCode",
  "quantity",
  "createdAt",
];

const buildImportForm = (file, options = {}) => {
  const formData = new FormData();
  formData.append("File", file);

  if (options.allowDuplicate !== undefined) {
    formData.append("AllowDuplicate", String(options.allowDuplicate));
  }
  if (options.correctionReason) {
    formData.append("CorrectionReason", options.correctionReason);
  }

  return formData;
};

export const salesImportService = {
  downloadTemplate: () =>
    downloadFile(axiosInstance, {
      fallbackFilename: "procurement-sales-import-template.xlsx",
      url: ENDPOINTS.PP_SALES_IMPORT_TEMPLATE,
    }),
  preview: async (file) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_SALES_IMPORT_PREVIEW,
      buildImportForm(file),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapResponse(response);
  },
  confirm: async (
    file,
    allowDuplicate = false,
    correctionReason = undefined,
  ) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_SALES_IMPORT_CONFIRM,
      buildImportForm(file, { allowDuplicate, correctionReason }),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapResponse(response);
  },
  listBatches: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_SALES_IMPORT_BATCHES, {
      params: sanitizeProcurementListParams(params, BATCH_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  getBatch: async (id) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PP_SALES_IMPORT_BATCH_BY_ID(id),
    );
    return unwrapResponse(response);
  },
  cancelBatch: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_SALES_IMPORT_BATCH_CANCEL(id),
      { reason },
    );
    return unwrapResponse(response);
  },
  createManual: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.PP_SALES_MANUAL,
      payload,
    );
    return unwrapResponse(response);
  },
  updateManual: async (id, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PP_SALES_MANUAL_BY_ID(id),
      payload,
    );
    return unwrapResponse(response);
  },
  deleteManual: async (id) => {
    const response = await axiosInstance.delete(
      ENDPOINTS.PP_SALES_MANUAL_BY_ID(id),
    );
    return unwrapResponse(response);
  },
  getHistory: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_SALES_HISTORY, {
      params: sanitizeProcurementListParams(params, HISTORY_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
  getSummary: async ({ fromDate, toDate }) => {
    // This endpoint is the contract exception: it binds camelCase date params.
    const response = await axiosInstance.get(ENDPOINTS.PP_SALES_SUMMARY, {
      params: sanitizeProcurementParams({ fromDate, toDate }),
    });
    return unwrapResponse(response);
  },
};
