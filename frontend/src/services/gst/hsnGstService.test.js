import { beforeEach, describe, expect, it, vi } from "vitest";

import axiosInstance from "../../api/axios";
import { hsnGstService } from "./hsnGstService";

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const success = { data: { succeeded: true, data: {} } };

describe("HSN/GST API contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the versioned HSN master endpoint and query contract", async () => {
    axiosInstance.get.mockResolvedValue(success);

    await hsnGstService.listHsnSac({ Search: "8471", CodeType: "HSN", PageSize: 20 });

    expect(axiosInstance.get).toHaveBeenCalledWith("/api/v1/gst/hsn-sac", {
      params: { Search: "8471", CodeType: "HSN", PageSize: 20 },
    });
  });

  it("sends a dated override to the item-specific endpoint", async () => {
    axiosInstance.put.mockResolvedValue(success);
    const payload = { hsnSacId: 12, effectiveFrom: "2026-10-15", effectiveTo: null };

    await hsnGstService.saveItemOverride(44, payload);

    expect(axiosInstance.put).toHaveBeenCalledWith(
      "/api/v1/gst/items/44/hsn-override",
      payload,
    );
  });

  it("uses explicit mapping identities when retiring a historical mapping", async () => {
    axiosInstance.put.mockResolvedValue(success);

    await hsnGstService.retireCategoryDefault(8, 21, {
      effectiveTo: "2026-10-15",
    });

    expect(axiosInstance.put).toHaveBeenCalledWith(
      "/api/v1/gst/categories/8/hsn-default/21/retire",
      { effectiveTo: "2026-10-15" },
    );
  });
});
