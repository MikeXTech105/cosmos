import { describe, expect, it } from "vitest";

import {
  clampRojmelPageSize,
  sanitizeRojmelListParams,
} from "./rojmelQuery";

describe("rojmelQuery", () => {
  it("clamps page size to the API maximum", () => {
    expect(clampRojmelPageSize(500)).toBe(200);
    expect(clampRojmelPageSize(0)).toBe(1);
    expect(clampRojmelPageSize("bad")).toBe(20);
  });

  it("keeps only an allowed complete sort", () => {
    expect(
      sanitizeRojmelListParams(
        { PageNumber: 0, PageSize: 500, SortBy: "AMOUNT", SortDirection: "DESC" },
        ["transactionDate", "amount"],
      ),
    ).toEqual({
      PageNumber: 1,
      PageSize: 200,
      SortBy: "amount",
      SortDirection: "desc",
    });

    expect(
      sanitizeRojmelListParams(
        { PageNumber: 2, PageSize: 20, SortBy: "walletCode", SortDirection: "asc" },
        ["walletName"],
      ),
    ).toEqual({ PageNumber: 2, PageSize: 20 });
  });
});
