import { describe, expect, it } from "vitest";
import { formatCell } from "../../../utils/reportFormat";
import { materialConsumptionColumns, manufacturingHistoryColumns } from "./manufacturingColumns";

describe("manufacturing quantity and measured waste display", () => {
  it("preserves the six-place posting boundary instead of displaying a positive material amount as zero", () => {
    const column = materialConsumptionColumns.find(x => x.key === "actualConsumedQuantity");
    expect(formatCell(0.000001, column)).toBe("0.000001");
    expect(formatCell(1.234567, column)).toBe("1.234567");
  });
  it("keeps unknown rejected output and measured scrap unavailable", () => {
    expect(formatCell(null, manufacturingHistoryColumns.find(x => x.key === "rejectedOutput"))).toBe("-");
    expect(formatCell(null, materialConsumptionColumns.find(x => x.key === "materialWasteQuantity"))).toBe("-");
  });
  it("renders server percentage points literally even below one percent", () => {
    const column = materialConsumptionColumns.find(x => x.key === "wastePercent");
    expect(formatCell(0.5, column)).toBe("0.5%");
    expect(formatCell(1, column)).toBe("1%");
    expect(formatCell(null, column)).toBe("-");
  });
});
