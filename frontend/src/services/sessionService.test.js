import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildApiUrl: vi.fn((endpoint) => `https://api.example.test${endpoint}`),
  clearAuthData: vi.fn(),
  dispatch: vi.fn(),
  getAuthData: vi.fn(),
  post: vi.fn(),
  setTokens: vi.fn((tokens) => ({ type: "auth/setTokens", payload: tokens })),
  updateAuthTokens: vi.fn(),
}));

vi.mock("axios", () => ({ default: { post: mocks.post } }));
vi.mock("../config/runtimeConfig", () => ({
  buildApiUrl: mocks.buildApiUrl,
  runtimeConfig: { API_BASE_URL: "https://api.example.test", error: null },
}));
vi.mock("../utils/authStorage", () => ({
  clearAuthData: mocks.clearAuthData,
  getAuthData: mocks.getAuthData,
  updateAuthTokens: mocks.updateAuthTokens,
}));
vi.mock("../store/slices/authSlice", () => ({
  clearCredentials: () => ({ type: "auth/clearCredentials" }),
  setTokens: mocks.setTokens,
}));
vi.mock("./apiServiceUtils", () => ({
  unwrapResponse: (response) => response.data,
}));

import { configureSessionStore, refreshSession } from "./sessionService";

describe("session refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureSessionStore({ dispatch: mocks.dispatch });
    mocks.getAuthData.mockReturnValue({ refreshToken: "refresh-token" });
  });

  it("uses the shared runtime API URL convention and persists refreshed tokens", async () => {
    mocks.post.mockResolvedValue({
      data: {
        data: { accessToken: "new-access", refreshToken: "new-refresh" },
        succeeded: true,
      },
    });

    await expect(refreshSession()).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    expect(mocks.buildApiUrl).toHaveBeenCalledWith("/api/auth/refresh-token");
    expect(mocks.post).toHaveBeenCalledWith(
      "https://api.example.test/api/auth/refresh-token",
      { refreshToken: "refresh-token" },
      { headers: { "Content-Type": "application/json" } },
    );
    expect(mocks.updateAuthTokens).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/setTokens",
      payload: { accessToken: "new-access", refreshToken: "new-refresh" },
    });
  });

  it("clears the session when refresh fails", async () => {
    mocks.post.mockRejectedValue(new Error("expired"));

    await expect(refreshSession()).rejects.toThrow("expired");

    expect(mocks.clearAuthData).toHaveBeenCalledOnce();
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "auth/clearCredentials" });
  });
});
