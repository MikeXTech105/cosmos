import axios from "axios";

import { ENDPOINTS } from "../api/endpoints";
import { clearCredentials, setTokens } from "../store/slices/authSlice";
import {
  clearAuthData,
  getAuthData,
  updateAuthTokens,
} from "../utils/authStorage";
import { unwrapResponse } from "./apiServiceUtils";

let refreshPromise = null;
let sessionStore = null;

const getApiBaseUrl = () => {
  const value = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("VITE_API_BASE_URL must be a valid HTTP(S) URL.");
  }

  return value.replace(/\/+$/, "");
};

export const configureSessionStore = (store) => {
  sessionStore = store;
};

export const clearSession = () => {
  clearAuthData();
  sessionStore?.dispatch(clearCredentials());
};

const performRefresh = async () => {
  const { refreshToken } = getAuthData();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await axios.post(
    `${getApiBaseUrl()}${ENDPOINTS.REFRESH_TOKEN}`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );
  const data = unwrapResponse(response).data;
  const tokens = {
    accessToken: data?.accessToken,
    refreshToken: data?.refreshToken ?? refreshToken,
  };

  if (!tokens.accessToken) {
    throw new Error("Refresh response did not include an access token");
  }

  updateAuthTokens(tokens);
  sessionStore?.dispatch(setTokens(tokens));

  return tokens;
};

export const refreshSession = () => {
  refreshPromise ??= performRefresh()
    .catch((error) => {
      clearSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};
