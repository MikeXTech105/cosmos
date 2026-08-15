import { describe, expect, it } from "vitest";

import { WARRANTY_RESOLUTION_TYPE } from "../constants/websiteEnums";
import {
  getAnnouncementLiveState,
  mapProductBenefitsFromResponse,
  mapProductBenefitsToRequest,
  slugifyWebsiteTitle,
  updateGeneratedSlug,
  validateWarrantyResolution,
} from "./websiteContent";

describe("website content helpers", () => {
  it("generates stable lowercase hyphenated slugs", () => {
    expect(slugifyWebsiteTitle("  WEWEL's UV---Resistant Product  ")).toBe("wewel-s-uv-resistant-product");
    expect(slugifyWebsiteTitle("Café   Shade!!!")).toBe("cafe-shade");
  });

  it("stops regenerating a slug once the user has edited it", () => {
    expect(updateGeneratedSlug({ slug: "old", slugTouched: false, title: "New Title" })).toEqual({ slug: "new-title", slugTouched: false, title: "New Title" });
    expect(updateGeneratedSlug({ slug: "custom-url", slugTouched: true, title: "New Title" })).toEqual({ slug: "custom-url", slugTouched: true, title: "New Title" });
  });

  it.each([
    [{ isActive: false }, false, "Inactive"],
    [{ isActive: true, startsAtUtc: "2026-08-16T00:00:00Z" }, false, "Starts in 2 days"],
    [{ isActive: true, startsAtUtc: "2026-08-13T00:00:00Z", endsAtUtc: "2026-08-15T00:00:00Z" }, true, "Active and within its display window"],
    [{ isActive: true, endsAtUtc: "2026-08-13T00:00:00Z" }, false, "Ended 13 Aug"],
    [{ isActive: true, startsAtUtc: null, endsAtUtc: null }, true, "Active and within its display window"],
  ])("computes announcement live state", (announcement, isLive, reason) => {
    expect(getAnnouncementLiveState(announcement, new Date("2026-08-14T00:00:00Z"))).toEqual({ isLive, reason });
  });

  it("enforces resolution-specific required fields", () => {
    expect(validateWarrantyResolution({ resolutionType: WARRANTY_RESOLUTION_TYPE.Refund })).toMatchObject({ refundAmount: expect.any(String), refundReference: expect.any(String) });
    expect(validateWarrantyResolution({ resolutionType: WARRANTY_RESOLUTION_TYPE.Refund, refundAmount: 100, refundReference: "R-1" })).toEqual({});
    expect(validateWarrantyResolution({ resolutionType: WARRANTY_RESOLUTION_TYPE.Replacement })).toHaveProperty("replacementReference");
    expect(validateWarrantyResolution({ resolutionType: WARRANTY_RESOLUTION_TYPE.Repair })).toHaveProperty("repairReference");
  });

  it("maps product benefit response strings to request objects and back", () => {
    const editable = mapProductBenefitsFromResponse(["UV protection", "Rust proof"]);
    expect(editable).toEqual([
      { benefitText: "UV protection", sortOrder: 0 },
      { benefitText: "Rust proof", sortOrder: 1 },
    ]);
    expect(mapProductBenefitsToRequest(editable)).toEqual(editable);
  });
});
