import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeSupplyChainImportParams } from "../../utils/supplyChainQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const appendFormValue = (formData, key, value) => {
  if (value === null || value === undefined || value === "") {
    return;
  }

  formData.append(key, value);
};

const buildValidationFormData = ({ channelId, file, importType }) => {
  const formData = new FormData();

  appendFormValue(formData, "File", file);
  appendFormValue(formData, "ImportType", importType);
  appendFormValue(formData, "ChannelId", channelId);

  return formData;
};

export const supplyChainImportService = {
  validate: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SC_IMPORT_VALIDATE,
      buildValidationFormData(payload),
    );

    return unwrapResponse(response);
  },

  list: async (params = {}) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_IMPORTS, {
      params: normalizeParams(sanitizeSupplyChainImportParams(params)),
    });

    return unwrapResponse(response);
  },

  getById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_IMPORT_BY_ID(id));

    return unwrapResponse(response);
  },

  getErrors: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.SC_IMPORT_ERRORS(id));

    return unwrapResponse(response);
  },

  downloadErrors: (id) =>
    axiosInstance.get(ENDPOINTS.SC_IMPORT_ERROR_EXPORT(id), {
      responseType: "blob",
    }),

  commit: async (id, payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SC_IMPORT_COMMIT(id),
      payload,
    );

    return unwrapResponse(response);
  },

  cancel: async (id, reason) => {
    const response = await axiosInstance.post(
      ENDPOINTS.SC_IMPORT_CANCEL(id),
      { reason },
    );

    return unwrapResponse(response);
  },
};
