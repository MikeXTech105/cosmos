import axios from "axios";

import { ENDPOINTS } from "../api/endpoints";
import { buildApiUrl, runtimeConfig } from "../config/runtimeConfig";
import {
  clearCredentials,
  replaceAuthSnapshot,
  setTokens,
} from "../store/slices/authSlice";
import {
  clearAuthData,
  getAuthData,
  getAuthStorageType,
  saveAuthData,
  updateAuthTokens,
} from "../utils/authStorage";
import { unwrapResponse } from "./apiServiceUtils";

let refreshPromise = null;
let sessionStore = null;

export const configureSessionStore = (store) => {
  sessionStore = store;
};

export const clearSession = () => {
  clearAuthData();
  sessionStore?.dispatch(clearCredentials());
};

const performRefresh = async () => {
  const storedAuth = getAuthData();
  const { refreshToken } = storedAuth;

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  if (runtimeConfig.error) {
    throw new Error(runtimeConfig.error);
  }

  const response = await axios.post(
    buildApiUrl(ENDPOINTS.REFRESH_TOKEN),
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

  if (Array.isArray(data?.pages)) {
    const snapshot = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: data.user ?? storedAuth.user,
      roles: data.roles ?? storedAuth.roles,
      pages: data.pages,
    };

    saveAuthData(snapshot, {
      rememberMe: getAuthStorageType() !== "session",
    });
    sessionStore?.dispatch(replaceAuthSnapshot(snapshot));

    return tokens;
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
