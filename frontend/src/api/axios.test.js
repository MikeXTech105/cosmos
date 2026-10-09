import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const instance = vi.fn();
  instance.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };

  return {
    create: vi.fn(() => instance),
    getAuthData: vi.fn(),
    instance,
    refreshSession: vi.fn(),
  };
});

vi.mock("axios", () => ({ default: { create: mocks.create } }));
vi.mock("../config/runtimeConfig", () => ({
  default: { API_BASE_URL: "https://api.example.test", error: null },
  runtimeConfig: { API_BASE_URL: "https://api.example.test", error: null },
}));
vi.mock("../utils/authStorage", () => ({ getAuthData: mocks.getAuthData }));
vi.mock("../services/apiServiceUtils", () => ({ unwrapResponse: vi.fn() }));
vi.mock("../services/sessionService", () => ({ refreshSession: mocks.refreshSession }));

import axiosInstance from "./axios";

describe("shared Axios client", () => {
  beforeEach(() => {
    mocks.getAuthData.mockClear();
    mocks.instance.mockClear();
    mocks.refreshSession.mockClear();
    mocks.getAuthData.mockReturnValue({ accessToken: "current-access" });
  });

  it("uses the configured API origin for login and ordinary endpoint paths", () => {
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://api.example.test" }),
    );
    expect(axiosInstance).toBe(mocks.instance);
  });

  it("updates the retry authorization header after refresh and retries once", async () => {
    const [, responseRejected] = mocks.instance.interceptors.response.use.mock.calls[0];
    mocks.refreshSession.mockResolvedValue({ accessToken: "refreshed-access" });
    const originalRequest = { headers: {}, url: "/api/items" };

    await responseRejected({
      config: originalRequest,
      response: { status: 401 },
    });

    expect(originalRequest).toMatchObject({
      _retry: true,
      headers: { Authorization: "Bearer refreshed-access" },
    });
    expect(mocks.instance).toHaveBeenCalledWith(originalRequest);

    await expect(
      responseRejected({
        config: originalRequest,
        response: { status: 401 },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
  });
});
