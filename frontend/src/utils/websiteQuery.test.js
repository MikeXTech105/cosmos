import { describe, expect, it } from "vitest";

import {
  sanitizeWarrantyClaimParams,
  sanitizeWebsiteAnnouncementParams,
  sanitizeWebsiteBlogParams,
  sanitizeWebsiteProductParams,
} from "./websiteQuery";

describe("website query sanitizers", () => {
  it("keeps response/query enum names as strings and maps camel-case UI keys", () => {
    expect(sanitizeWebsiteProductParams({ pageNumber: 2, pageSize: 25, publishStatus: "Published" })).toMatchObject({ PageNumber: 2, PageSize: 25, PublishStatus: "Published" });
    expect(sanitizeWebsiteBlogParams({ publishStatus: "Draft", categoryId: 7 })).toMatchObject({ PublishStatus: "Draft", CategoryId: 7 });
    expect(sanitizeWebsiteAnnouncementParams({ placement: "TopBar" })).toMatchObject({ Placement: "TopBar" });
  });

  it("clamps page size and omits empty sorting parameters", () => {
    const result = sanitizeWebsiteProductParams({ PageSize: 999, SortBy: "", SortDirection: "" });
    expect(result.PageSize).toBe(200);
    expect(result).not.toHaveProperty("SortBy");
    expect(result).not.toHaveProperty("SortDirection");
  });

  it("converts submitted local date-times to UTC without changing string status values", () => {
    const result = sanitizeWarrantyClaimParams({ status: "UnderReview", submittedFromUtc: "2026-08-14T10:00" });
    expect(result.Status).toBe("UnderReview");
    expect(result.SubmittedFromUtc).toMatch(/^2026-08-14T/);
    expect(result.SubmittedFromUtc).toMatch(/Z$/);
  });
});
