import axios from "axios";
import { ENDPOINTS } from "./endpoints";
import {
  clearAuthData,
  getAuthData,
  updateAuthTokens,
} from "../utils/authStorage";
import { unwrapResponse } from "../services/apiServiceUtils";
import { store } from "../store/store";
import { clearCredentials, setTokens } from "../store/slices/authSlice";

const getApiBaseUrl = () => {
  const value = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("unsupported protocol");
    }

    return value.replace(/\/+$/, "");
  } catch {
    throw new Error(
      "VITE_API_BASE_URL must be configured as a valid HTTP(S) URL.",
    );
  }
};

const API_BASE_URL = getApiBaseUrl();

const AUTH_REFRESH_EXCLUDED_ENDPOINTS = [
  ENDPOINTS.LOGIN,
  ENDPOINTS.REFRESH_TOKEN,
  ENDPOINTS.LOGOUT,
  ENDPOINTS.FORGOT_PASSWORD,
  ENDPOINTS.RESET_PASSWORD,
];

let refreshPromise = null;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

const normalizeEndpointPath = (url = "") => {
  try {
    const pathname = new URL(url, `${API_BASE_URL}/`).pathname;

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

const clearSessionAndRedirect = () => {
  clearAuthData();
  store.dispatch(clearCredentials());

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

const requestNewAccessToken = async () => {
  const { refreshToken } = getAuthData();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await axios.post(
    `${API_BASE_URL}${ENDPOINTS.REFRESH_TOKEN}`,
    { refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const data = unwrapResponse(response).data;
  const nextTokens = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
  };

  if (!nextTokens.accessToken) {
    throw new Error("Refresh response did not include an access token");
  }

  updateAuthTokens(nextTokens);
  store.dispatch(setTokens(nextTokens));

  return nextTokens.accessToken;
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

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise ??= requestNewAccessToken().finally(() => {
          refreshPromise = null;
        });

        const newAccessToken = await refreshPromise;

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        clearSessionAndRedirect();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
