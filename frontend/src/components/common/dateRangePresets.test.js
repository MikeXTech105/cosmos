import { describe, expect, it } from "vitest";
import { getQuickDateRange } from "./dateRangePresets";

describe("date range presets", () => {
  it("includes today in rolling ranges across a year boundary", () => {
    expect(getQuickDateRange("last7", new Date(2026, 0, 3))).toEqual({ fromDate: "2025-12-28", toDate: "2026-01-03" });
    expect(getQuickDateRange("last30", new Date(2026, 0, 3))).toEqual({ fromDate: "2025-12-05", toDate: "2026-01-03" });
  });
  it("uses complete previous months including leap days", () => {
    expect(getQuickDateRange("lastMonth", new Date(2024, 2, 31))).toEqual({ fromDate: "2024-02-01", toDate: "2024-02-29" });
    expect(getQuickDateRange("lastMonth", new Date(2026, 0, 1))).toEqual({ fromDate: "2025-12-01", toDate: "2025-12-31" });
  });
  it("starts weeks on Monday and ends the previous week on Sunday", () => {
    expect(getQuickDateRange("thisWeek", new Date(2026, 8, 20))).toEqual({ fromDate: "2026-09-14", toDate: "2026-09-20" });
    expect(getQuickDateRange("lastWeek", new Date(2026, 8, 21))).toEqual({ fromDate: "2026-09-14", toDate: "2026-09-20" });
  });
  it("handles yesterday and year-to-date using local dates", () => {
    expect(getQuickDateRange("yesterday", new Date(2026, 0, 1))).toEqual({ fromDate: "2025-12-31", toDate: "2025-12-31" });
    expect(getQuickDateRange("yearToDate", new Date(2026, 8, 17))).toEqual({ fromDate: "2026-01-01", toDate: "2026-09-17" });
  });
  it("clears both date bounds for lifetime", () => {
    expect(getQuickDateRange("lifetime")).toEqual({ fromDate: "", toDate: "" });
  });
});
