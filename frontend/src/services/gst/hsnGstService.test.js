import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosInstance from "../../api/axios";
import { hsnGstService } from "./hsnGstService";

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const success = { data: { succeeded: true, data: {} } };

describe("GST rate-history API contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the selected Item and explicit invoice date through a real endpoint", async () => {
    axiosInstance.get.mockResolvedValue(success);
    const controller = new AbortController();
    await hsnGstService.getEffectiveClassification("9007199254740993", "2026-10-28", { signal: controller.signal });
    expect(axiosInstance.get).toHaveBeenCalledWith("/api/v1/gst/items/9007199254740993/effective-classification", expect.objectContaining({ params: { onDate: "2026-10-28" }, signal: controller.signal }));
  });
  it("maintains and retires dated mappings using the original master identities", async () => {
    axiosInstance.put.mockResolvedValue(success); axiosInstance.post.mockResolvedValue(success);
    const payload = { hsnSacId: "42", effectiveFrom: "2026-10-28", effectiveTo: null };
    await hsnGstService.saveCategoryDefault("17", payload);
    await hsnGstService.saveItemOverride("9007199254740993", payload);
    await hsnGstService.retireItemOverride("9007199254740993", "42", "2026-11-01");
    const categoryCall = axiosInstance.put.mock.calls.find(call => call[0] === "/api/v1/gst/categories/17/hsn-default");
    expect(String(categoryCall[1].hsnSacId)).toBe("42");
    expect(categoryCall[1].effectiveFrom).toBe("2026-10-28");
    expect(axiosInstance.put.mock.calls.some(call => call[0] === "/api/v1/gst/items/9007199254740993/hsn-override")).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith("/api/v1/gst/items/9007199254740993/hsn-override/42/retire", { effectiveTo: "2026-11-01" }, expect.any(Object));
  });

  it("uses the versioned GST rate-history endpoint and query contract", async () => {
    axiosInstance.get.mockResolvedValue(success);

    await hsnGstService.listRateVersions({ RuleCode: "STANDARD", PageSize: 20 });

    expect(axiosInstance.get).toHaveBeenCalledWith("/api/v1/gst/rate-versions", {
      params: { RuleCode: "STANDARD", PageSize: 20 },
    });
  });

  it("creates a GST rate version", async () => {
    axiosInstance.post.mockResolvedValue(success);
    const payload = { ruleCode: "STANDARD", totalRate: 18, effectiveFrom: "2026-10-15" };

    await hsnGstService.createRateVersion(payload);

    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/v1/gst/rate-versions",
      payload,
    );
  });
});
