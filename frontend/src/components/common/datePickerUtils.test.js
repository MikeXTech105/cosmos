import { describe, expect, it } from "vitest";

import {
  clampCalendarView,
  formatDatePickerValue,
  getCalendarDays,
  isDateWithinBounds,
  parseIsoDate,
  toIsoDate,
} from "./datePickerUtils";

describe("datePickerUtils", () => {
  it("parses valid ISO dates without timezone drift", () => {
    expect(toIsoDate(parseIsoDate("2026-08-04"))).toBe("2026-08-04");
    expect(toIsoDate(parseIsoDate("2024-02-29T10:30"))).toBe("2024-02-29");
  });

  it("rejects impossible dates", () => {
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
  });

  it("formats date and datetime values for the app fields", () => {
    expect(formatDatePickerValue("2026-08-04")).toBe("04-08-2026");
    expect(formatDatePickerValue("2026-08-04T09:45", "datetime-local")).toBe(
      "04-08-2026, 09:45",
    );
  });

  it("creates a six-week Monday-first calendar grid", () => {
    const days = getCalendarDays(new Date(2026, 7, 1, 12));

    expect(days).toHaveLength(42);
    expect(toIsoDate(days[0])).toBe("2026-07-27");
    expect(toIsoDate(days[41])).toBe("2026-09-06");
  });

  it("applies minimum and maximum date bounds", () => {
    expect(isDateWithinBounds(new Date(2026, 7, 4, 12), "2026-08-01", "2026-08-10")).toBe(true);
    expect(isDateWithinBounds(new Date(2026, 6, 31, 12), "2026-08-01", "2026-08-10")).toBe(false);
    expect(isDateWithinBounds(new Date(2026, 7, 11, 12), "2026-08-01", "2026-08-10")).toBe(false);
  });

  it("clamps the visible month into the allowed range", () => {
    expect(toIsoDate(clampCalendarView(new Date(2025, 0, 1), "2026-08-04", ""))).toBe("2026-08-01");
    expect(toIsoDate(clampCalendarView(new Date(2027, 0, 1), "", "2026-08-04"))).toBe("2026-08-01");
  });
});
