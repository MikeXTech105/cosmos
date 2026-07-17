import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { unwrapResponse } from "../apiServiceUtils";
import { sanitizeProcurementListParams } from "./procurementServiceUtils";

const ISSUE_SORT_FIELDS = ["productCode", "productName", "issueType"];

export const bomService = {
  getProductBom: async (productId) => {
    const response = await axiosInstance.get(
      ENDPOINTS.PP_BOM_BY_PRODUCT(productId),
    );
    return unwrapResponse(response);
  },
  saveProductBom: async (productId, payload) => {
    const response = await axiosInstance.put(
      ENDPOINTS.PP_BOM_BY_PRODUCT(productId),
      payload,
    );
    return unwrapResponse(response);
  },
  getIssues: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.PP_BOM_ISSUES, {
      params: sanitizeProcurementListParams(params, ISSUE_SORT_FIELDS),
    });
    return unwrapResponse(response);
  },
};
