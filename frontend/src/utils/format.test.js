import { describe, expect, it } from "vitest";

import {
  EMPTY_VALUE,
  formatCurrency,
  formatDate,
  formatDateInput,
  formatDateRange,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatQuantity,
} from "./format";

describe("format guards", () => {
  it.each([null, undefined, "", Number.NaN, "not-a-date"])(
    "returns the empty marker for an invalid display value: %s",
    (value) => {
      expect(formatDate(value)).toBe(EMPTY_VALUE);
    },
  );

  it.each([null, undefined, "", Number.NaN, "not-a-number"])(
    "returns the empty marker for an invalid numeric value: %s",
    (value) => {
      expect(formatNumber(value)).toBe(EMPTY_VALUE);
      expect(formatCurrency(value)).toBe(EMPTY_VALUE);
      expect(formatPercent(value)).toBe(EMPTY_VALUE);
    },
  );

  it("keeps zero as a real value", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatQuantity(0)).toBe("0");
  });
});

describe("date formatting", () => {
  it("uses the COSMOS display formats", () => {
    expect(formatDate("2026-07-17")).toBe("17 Jul 2026");
    expect(formatDateTime("2026-07-17T11:58:00")).toBe(
      "17 Jul 2026, 11:58 am",
    );
  });

  it("collapses common date-range parts", () => {
    expect(formatDateRange("2026-06-24", "2026-07-23")).toBe(
      "24 Jun – 23 Jul 2026",
    );
    expect(formatDateRange("2026-07-17", "2026-07-23")).toBe(
      "17 – 23 Jul 2026",
    );
    expect(formatDateRange("2025-12-31", "2026-01-01")).toBe(
      "31 Dec 2025 – 01 Jan 2026",
    );
  });

  it("reserves ISO dates for inputs and wire values", () => {
    expect(formatDateInput("2026-07-17")).toBe("2026-07-17");
    expect(formatDateInput("not-a-date")).toBe(EMPTY_VALUE);
  });
});

describe("numeric formatting", () => {
  it("uses Indian grouping and removes trailing zeroes", () => {
    expect(formatNumber(1234567.5)).toBe("12,34,567.5");
    expect(formatQuantity(18.5)).toBe("18.5");
    expect(formatQuantity(18.567)).toBe("18.57");
  });

  it("supports explicit precision up to six decimal places", () => {
    expect(formatNumber(1.23456789, { maxFractionDigits: 6 })).toBe(
      "1.234568",
    );
  });

  it("formats INR currency and percentages", () => {
    expect(formatCurrency(1234.5)).toBe("₹1,234.5");
    expect(formatPercent(0.125)).toBe("12.5%");
    expect(formatPercent(12.5)).toBe("12.5%");
  });
});
