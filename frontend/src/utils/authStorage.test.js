import { beforeEach, describe, expect, it } from "vitest";

import {
  clearAuthData,
  getAuthData,
  getAuthStorageType,
  saveAuthData,
  updateAuthTokens,
} from "./authStorage";

const createStorage = () => {
  const values = new Map();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

const authData = {
  accessToken: "access-1",
  pages: [{ route: "/dashboard", canView: true }],
  refreshToken: "refresh-1",
  roles: ["Admin"],
  user: { id: "user-1" },
};

beforeEach(() => {
  globalThis.window = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
  };
});

describe("auth storage selection", () => {
  it("persists remembered sessions in localStorage", () => {
    saveAuthData(authData, { rememberMe: true });

    expect(getAuthStorageType()).toBe("local");
    expect(window.localStorage.getItem("accessToken")).toBe("access-1");
    expect(window.sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("keeps non-remembered sessions in sessionStorage", () => {
    saveAuthData(authData, { rememberMe: false });

    expect(getAuthStorageType()).toBe("session");
    expect(window.sessionStorage.getItem("accessToken")).toBe("access-1");
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });

  it("updates refreshed tokens in the active storage", () => {
    saveAuthData(authData, { rememberMe: false });
    updateAuthTokens({ accessToken: "access-2", refreshToken: "refresh-2" });

    expect(getAuthData().accessToken).toBe("access-2");
    expect(window.sessionStorage.getItem("refreshToken")).toBe("refresh-2");
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });

  it("clears auth keys from both storages", () => {
    window.localStorage.setItem("accessToken", "stale-local");
    window.sessionStorage.setItem("accessToken", "stale-session");

    clearAuthData();

    expect(window.localStorage.getItem("accessToken")).toBeNull();
    expect(window.sessionStorage.getItem("accessToken")).toBeNull();
    expect(getAuthStorageType()).toBeNull();
  });

  it("migrates a legacy localStorage session without logging the user out", () => {
    window.localStorage.setItem("accessToken", "legacy-access");
    window.localStorage.setItem("refreshToken", "legacy-refresh");

    expect(getAuthData().accessToken).toBe("legacy-access");
    expect(getAuthStorageType()).toBe("local");
    expect(window.localStorage.getItem("cosmos_auth_storage")).toBe("local");
  });
});

