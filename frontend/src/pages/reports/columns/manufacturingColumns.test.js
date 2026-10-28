import { describe, expect, it } from "vitest";
import { formatCell, formatCurrency, formatPercent, getReportValue } from "../../../utils/reportFormat";
import { manufacturingHistoryColumns, materialConsumptionColumns } from "./manufacturingColumns";

describe("manufacturing report precise cells", () => {
  it("formats every production/material quantity column with all six posting decimals without losing whole digits", () => {
    const quantities = [...manufacturingHistoryColumns, ...materialConsumptionColumns].filter(column => column.format === "qty");
    expect(quantities).toHaveLength(6);
    for (const column of quantities) {
      expect(formatCell("9999999999999999.999999", column)).toBe("9,999,999,999,999,999.999999");
      expect(formatCell("0.000001", column)).toBe("0.000001");
      expect(formatCell("0", column)).toBe("0");
      expect(formatCell(null, column)).toBe("-");
      expect(formatCell(getReportValue({ measure: null }, "measure"), column)).toBe("-");
    }
  });
  it("renders measured percentages literally and keeps unavailable measures absent", () => {
    const measuredWaste = materialConsumptionColumns.find(column => column.key === "wastePercent");
    expect(formatCell("0.5", measuredWaste)).toBe("0.5%");
    expect(formatCell("0.000001", measuredWaste)).toBe("0.000001%");
    expect(formatCell("9999999999999999.999999", measuredWaste)).toBe("9999999999999999.999999%");
    expect(formatCell(null, measuredWaste)).toBe("-");
    expect(formatCell("-", measuredWaste)).toBe("-");
  });
  it("does not alter other report percentage or money semantics", () => {
    expect(formatPercent(0.5)).toBe("50%");
    expect(formatCell(0.5, { format: "percent" })).toBe("50%");
    expect(formatCurrency(1234.5)).toBe("₹1,234.50");
  });
});
