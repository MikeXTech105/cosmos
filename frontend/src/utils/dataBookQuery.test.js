import { describe, expect, it } from "vitest";

import {
  DATA_BOOK_TABS,
  DATA_BOOK_VISIBILITY,
  getDataBookTabQuery,
} from "../constants/dataBookEnums";
import {
  sanitizeDataBookExportParams,
  sanitizeDataBookListParams,
} from "./dataBookQuery";

describe("Data Book query contract", () => {
  it("clamps page size and omits an empty or unsupported sort", () => {
    const result = sanitizeDataBookListParams({
      PageNumber: 2,
      PageSize: 900,
      SortBy: "",
      SortDirection: "",
    });

    expect(result.PageNumber).toBe(2);
    expect(result.PageSize).toBe(200);
    expect(result).not.toHaveProperty("SortBy");
    expect(result).not.toHaveProperty("SortDirection");
  });

  it("omits an empty Category for the uncategorised client-side view", () => {
    const result = sanitizeDataBookListParams({
      Category: "",
      PageNumber: 1,
      PageSize: 200,
    });

    expect(result).not.toHaveProperty("Category");
  });

  it("omits paging from export and preserves lowercase format", () => {
    const result = sanitizeDataBookExportParams({
      PageNumber: 8,
      PageSize: 50,
      Search: "courier",
    });

    expect(result).toEqual({ Search: "courier", format: "csv" });
    expect(result).not.toHaveProperty("PageNumber");
    expect(result).not.toHaveProperty("PageSize");
    expect(result).not.toHaveProperty("Format");
  });

  it("maps every tab to the documented privacy query", () => {
    expect(getDataBookTabQuery(DATA_BOOK_TABS.ALL)).toEqual({
      Visibility: DATA_BOOK_VISIBILITY.ALL,
    });
    expect(getDataBookTabQuery(DATA_BOOK_TABS.PUBLIC)).toEqual({
      Visibility: DATA_BOOK_VISIBILITY.PUBLIC,
    });
    expect(getDataBookTabQuery(DATA_BOOK_TABS.MY_PRIVATE)).toEqual({
      Visibility: DATA_BOOK_VISIBILITY.MY_PRIVATE,
    });
    expect(getDataBookTabQuery(DATA_BOOK_TABS.RECENT)).toEqual({
      SortBy: "updatedAtUtc",
      SortDirection: "desc",
      Visibility: DATA_BOOK_VISIBILITY.ALL,
    });
  });
});
