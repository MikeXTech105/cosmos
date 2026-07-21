import { describe, expect, it } from "vitest";

import { normalizePagedPayload } from "./inventorySliceHelpers";

describe("normalizePagedPayload summaries", () => {
  it("preserves an optional all-matching summary", () => {
    const summary = { activeCount: 8, inactiveCount: 2, totalCount: 10 };

    expect(
      normalizePagedPayload({ items: [{ id: 1 }], totalCount: 10, summary }),
    ).toMatchObject({
      summary,
      summaryScope: "all-matching",
      totalCount: 10,
    });
  });

  it("marks list-derived fallback values as current-page", () => {
    expect(normalizePagedPayload({ items: [{ id: 1 }], totalCount: 10 })).toMatchObject({
      summary: null,
      summaryScope: "current-page",
    });
    expect(normalizePagedPayload([{ id: 1 }])).toMatchObject({
      summary: null,
      summaryScope: "current-page",
    });
  });
});
