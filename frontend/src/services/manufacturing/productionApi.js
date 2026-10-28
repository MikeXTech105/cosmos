import { parse, stringify } from "lossless-json";
import axiosInstance from "../../api/axios";

export const parseProductionJson = text => parse(text, null, value => /^-?\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : value);
export const serializeProductionJson = value => typeof value === "string" ? value : stringify(value);
const precision = config => ({ ...config, transformRequest: [serializeProductionJson], transformResponse: [value => typeof value === "string" && value.length ? parseProductionJson(value) : value] });
// Reuse the existing auth/refresh/interceptor pipeline; opt in only these contracts.
const productionApi = {
  get: (url, config) => axiosInstance.get(url, precision(config)),
  post: (url, data, config) => axiosInstance.post(url, data, precision(config)),
  put: (url, data, config) => axiosInstance.put(url, data, precision(config)),
  patch: (url, data, config) => axiosInstance.patch(url, data, precision(config)),
  delete: (url, config) => axiosInstance.delete(url, precision(config)),
};
export default productionApi;
