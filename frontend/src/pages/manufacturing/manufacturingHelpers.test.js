import { describe, expect, it } from "vitest";

import {
  buildBomPayload,
  calculateRequiredQuantity,
  isDraftProduction,
  normalizePage,
} from "./manufacturingHelpers";

describe("manufacturing helpers", () => {
  it("calculates base plus wastage for the produced quantity", () => {
    expect(calculateRequiredQuantity({ baseQuantity: 2, wastagePercentage: 5 }, 10)).toBe(21);
  });

  it("normalizes envelope and array list responses", () => {
    expect(normalizePage({ data: { items: [{ id: 1 }], totalCount: 1 } }).items).toHaveLength(1);
    expect(normalizePage([{ id: 2 }]).totalCount).toBe(1);
  });

  it("recognizes draft statuses without relying on casing", () => {
    expect(isDraftProduction({ status: "draft" })).toBe(true);
    expect(isDraftProduction({ status: "Posted" })).toBe(false);
  });

  it("serializes BOM lines with numeric quantities", () => {
    expect(buildBomPayload({
      finishedItem: { id: "8" },
      version: " v2 ",
      description: "",
      isDefault: true,
      components: [{ item: { id: "4" }, baseQuantity: "2.5", wastagePercentage: "3" }],
    })).toEqual({
      finishedItemId: 8,
      version: "v2",
      description: null,
      isDefault: true,
      components: [{ componentItemId: 4, baseQuantity: 2.5, wastagePercentage: 3 }],
    });
  });
});
