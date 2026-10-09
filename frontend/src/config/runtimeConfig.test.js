import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig, validateApiBaseUrl } from "./runtimeConfig";

describe("runtime API configuration", () => {
  it("accepts HTTP(S) origins, normalizes an optional /api suffix, and normalizes same-origin /api", () => {
    expect(validateApiBaseUrl("https://api.example.com/")).toEqual({
      error: null,
      value: "https://api.example.com",
    });
    expect(validateApiBaseUrl("https://api.example.com/api/")).toEqual({
      error: null,
      value: "https://api.example.com",
    });
    expect(validateApiBaseUrl("/api/")).toEqual({ error: null, value: "" });
    expect(validateApiBaseUrl("")).toEqual({ error: null, value: "" });
  });

  it("rejects dangerous protocols without throwing", () => {
    expect(validateApiBaseUrl("javascript:alert(1)")).toMatchObject({
      value: "",
    });
    expect(validateApiBaseUrl("javascript:alert(1)").error).toMatch(/HTTP/);
  });

  it("prefers an explicitly supplied runtime value, including same-origin", () => {
    expect(
      resolveRuntimeConfig({
        buildValue: "https://build.example.com",
        runtimeValue: "",
      }),
    ).toMatchObject({ API_BASE_URL: "", error: expect.any(String), source: "runtime" });
  });

  it("prefers runtime configuration over build configuration", () => {
    expect(
      resolveRuntimeConfig({
        buildValue: "https://build.example.com",
        runtimeValue: "https://runtime.example.com/api",
      }),
    ).toEqual({
      API_BASE_URL: "https://runtime.example.com",
      error: null,
      source: "runtime",
    });
  });

  it("allows same-origin only when explicitly enabled for local development or tests", () => {
    expect(resolveRuntimeConfig({ allowSameOrigin: true })).toEqual({
      API_BASE_URL: "",
      error: null,
      source: "same-origin",
    });
    expect(resolveRuntimeConfig()).toMatchObject({
      API_BASE_URL: "",
      error: expect.stringContaining("required"),
    });
  });
});
