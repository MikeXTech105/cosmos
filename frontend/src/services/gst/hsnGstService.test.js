import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosInstance from "../../api/axios";
import { hsnGstService } from "./hsnGstService";

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const success = { data: { succeeded: true, data: {} } };

describe("GST rate-history API contract", () => {
  beforeEach(() => vi.clearAllMocks());

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
