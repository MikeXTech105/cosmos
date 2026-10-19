import { describe, expect, it } from "vitest";

import {
  effectiveSourceLabel,
  formatEffectiveRange,
  getPagedItems,
  getTotalCount,
  validateHsnSacInput,
  validateRateVersionInput,
} from "./hsnGstHelpers";

describe("HSN/GST frontend response helpers", () => {
  it("reads the paged API contract without assuming an array response", () => {
    const response = { data: { items: [{ id: 7 }], totalCount: 23 } };

    expect(getPagedItems(response)).toEqual([{ id: 7 }]);
    expect(getTotalCount(response, 1)).toBe(23);
  });

  it("keeps the effective-classification source truthful", () => {
    expect(effectiveSourceLabel("ProductOverride")).toBe("Product override");
    expect(effectiveSourceLabel("CategoryDefault")).toBe("Category default");
    expect(effectiveSourceLabel("Missing")).toBe("No active mapping");
    expect(formatEffectiveRange({ effectiveFrom: "2026-10-15" })).toBe(
      "From 2026-10-15",
    );
  });

  it("mirrors the server-side Phase 1 input boundaries before submit", () => {
    expect(validateHsnSacInput({ code: "12-34", description: "Parts" })).toBe(
      "Code must contain no more than 50 letters or digits.",
    );
    expect(validateRateVersionInput({
      ruleCode: "STANDARD",
      totalRate: "101",
      effectiveFrom: "2026-10-15",
    })).toBe("Total rate must be between 0 and 100.");
  });
});
