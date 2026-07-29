import { describe, expect, it } from "vitest";

import {
  formatProcurementDecimal,
  formatProcurementQuantity,
} from "./procurementHelpers";
import enMessages from "../../i18n/locales/en/procurement.json";
import hiEnMessages from "../../i18n/locales/hi-en/procurement.json";
import {
  getOrderSummary,
  getPlanningCsvRows,
} from "./home/procurementHomeHelpers";

describe("procurement quantity formatting", () => {
  it("shows at most two decimal places without trailing zeroes", () => {
    expect(formatProcurementQuantity(18461.333333)).toBe("18,461.33");
    expect(formatProcurementQuantity(18.5)).toBe("18.5");
    expect(formatProcurementQuantity(18)).toBe("18");
  });

  it("returns the requested fallback for an empty value", () => {
    expect(formatProcurementQuantity(null)).toBe("—");
    expect(formatProcurementQuantity(undefined, "0")).toBe("0");
  });

  it("allows decimal callers to request precision up to six places", () => {
    expect(formatProcurementDecimal(1.2345)).toBe("1.23");
    expect(
      formatProcurementDecimal(1.23456789, "-", {
        maxFractionDigits: 6,
      }),
    ).toBe("1.234568");
  });
});

describe("procurement order-summary pluralisation", () => {
  it("hides the count when nothing needs ordering", () => {
    expect(getOrderSummary(0)).toEqual({
      count: 0,
      showCount: false,
      text: "Nothing to order",
    });
  });

  it("uses singular copy for one material", () => {
    expect(getOrderSummary(1)).toEqual({
      count: 1,
      showCount: true,
      text: "material needs an order",
    });
  });

  it("uses plural copy for multiple materials", () => {
    expect(getOrderSummary(4)).toEqual({
      count: 4,
      showCount: true,
      text: "materials need an order",
    });
  });

  it.each([
    ["English", enMessages.home],
    ["Hindi-English", hiEnMessages.home],
  ])("keeps zero, singular, and plural copy distinct in %s", (_locale, messages) => {
    expect(getOrderSummary(0, messages).text).toBe(messages.nothingToOrder);
    expect(getOrderSummary(1, messages).text).toBe(messages.materialNeedsOrder);
    expect(getOrderSummary(2, messages).text).toBe(messages.materialsNeedOrder);
  });
});

describe("procurement buy-list CSV mapping", () => {
  it("uses material DTO fields and preserves raw numeric precision", () => {
    const [row] = getPlanningCsvRows([
      {
        calculatedSuggestedQuantity: 1.234567,
        inboundStock: 2.345678,
        itemCode: "WRONG-CODE",
        itemName: "Wrong fallback",
        materialItemCode: "MAT-001",
        materialItemName: "Correct material",
        physicalStock: 3.456789,
        projectedAvailableStock: 5.802467,
        reorderPoint: 8.765432,
        unitShortName: "kg",
      },
    ]);

    expect(row.slice(0, 3)).toEqual(["MAT-001", "Correct material", "kg"]);
    expect(row.slice(3, 8)).toEqual([
      3.456789,
      2.345678,
      5.802467,
      8.765432,
      1.234567,
    ]);
  });
});
