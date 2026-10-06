import axios from "axios";
import { toast } from "sonner";
import { ENDPOINTS } from "./endpoints";
import { getAuthData } from "../utils/authStorage";
import { unwrapResponse } from "../services/apiServiceUtils";
import { refreshSession } from "../services/sessionService";
import runtimeConfig from "../config/runtimeConfig";

const API_BASE_URL = runtimeConfig.API_BASE_URL;

const AUTH_REFRESH_EXCLUDED_ENDPOINTS = [
  ENDPOINTS.LOGIN,
  ENDPOINTS.REFRESH_TOKEN,
  ENDPOINTS.LOGOUT,
  ENDPOINTS.FORGOT_PASSWORD,
  ENDPOINTS.RESET_PASSWORD,
];

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

const normalizeEndpointPath = (url = "") => {
  try {
    const origin = globalThis.location?.origin ?? "http://localhost";
    const baseUrl = API_BASE_URL
      ? new URL(`${API_BASE_URL}/`, origin)
      : new URL("/", origin);
    const pathname = new URL(url, baseUrl).pathname;

    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  } catch {
    return "";
  }
};

const AUTH_REFRESH_EXCLUDED_PATHS = new Set(
  AUTH_REFRESH_EXCLUDED_ENDPOINTS.map(normalizeEndpointPath),
);

const shouldSkipRefresh = (url = "") => {
  return AUTH_REFRESH_EXCLUDED_PATHS.has(normalizeEndpointPath(url));
};

axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = getAuthData();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => {
    unwrapResponse(response);

    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 409 && originalRequest?.method?.toLowerCase() === "put"
      && /^\/api\/v1\/procurement-planning\/boms\/products\/[^/]+$/.test(normalizeEndpointPath(originalRequest.url))) {
      toast.error("Procurement BOM editing has moved to Manufacturing. Open the Manufacturing BOM to make changes.");
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const { accessToken: newAccessToken } = await refreshSession();

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
