import { describe, expect, it } from "vitest";

import {
  localDateTimeToUtcIso,
  sanitizeActivityLogExportParams,
  sanitizeActivityLogListParams,
} from "./activityLogQuery";

describe("activity log query contract", () => {
  it("keeps only documented PascalCase filters", () => {
    const result = sanitizeActivityLogListParams({
      Action: "Updated",
      Module: "Inventory",
      PageNumber: 2,
      PageSize: 50,
      Search: "bearing",
      search: "wrong casing",
      statusCode: 500,
    });

    expect(result).toMatchObject({
      Action: "Updated",
      Module: "Inventory",
      PageNumber: 2,
      PageSize: 50,
      Search: "bearing",
    });
    expect(result).not.toHaveProperty("search");
    expect(result).not.toHaveProperty("statusCode");
  });

  it("omits unsupported sort fields and their direction", () => {
    const result = sanitizeActivityLogListParams({
      PageSize: 50,
      SortBy: "CreatedAtUtc",
      SortDirection: "desc",
    });

    expect(result).not.toHaveProperty("SortBy");
    expect(result).not.toHaveProperty("SortDirection");
  });

  it("canonicalizes an allowed sort and clamps PageSize to 200", () => {
    expect(
      sanitizeActivityLogListParams({
        PageSize: 900,
        SortBy: "httpstatuscode",
        SortDirection: "ASC",
      }),
    ).toMatchObject({
      PageNumber: 1,
      PageSize: 200,
      SortBy: "HttpStatusCode",
      SortDirection: "asc",
    });
  });

  it("drops paging from export and preserves lowercase format", () => {
    const result = sanitizeActivityLogExportParams({
      Module: "HR",
      PageNumber: 4,
      PageSize: 100,
      SortBy: "TimestampUtc",
      SortDirection: "desc",
    });

    expect(result).toEqual({
      Module: "HR",
      SortBy: "TimestampUtc",
      SortDirection: "desc",
      format: "csv",
    });
    expect(result).not.toHaveProperty("Format");
  });

  it("converts local datetime values to UTC ISO strings", () => {
    const localValue = "2026-08-11T14:35";
    const expected = new Date(2026, 7, 11, 14, 35).toISOString();

    expect(localDateTimeToUtcIso(localValue)).toBe(expected);
    expect(
      sanitizeActivityLogListParams({
        FromDate: localValue,
        PageSize: 50,
        ToDate: "2026-08-11T15:05",
      }),
    ).toMatchObject({
      FromDate: expected,
      ToDate: new Date(2026, 7, 11, 15, 5).toISOString(),
    });
  });

  it("never sends UserId and Username together", () => {
    const result = sanitizeActivityLogListParams({
      PageSize: 50,
      UserId: 17,
      Username: "operator",
    });

    expect(result.UserId).toBe(17);
    expect(result).not.toHaveProperty("Username");
  });
});

