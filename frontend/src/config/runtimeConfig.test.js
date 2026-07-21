import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig, validateApiBaseUrl } from "./runtimeConfig";

describe("runtime API configuration", () => {
  it("accepts HTTP(S), same-origin paths, and an empty base", () => {
    expect(validateApiBaseUrl("https://api.example.com/")).toEqual({
      error: null,
      value: "https://api.example.com",
    });
    expect(validateApiBaseUrl("/api/")).toEqual({ error: null, value: "/api" });
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
    ).toMatchObject({ API_BASE_URL: "", error: null, source: "runtime" });
  });
});
