import { describe, expect, it } from "vitest";

import {
  getEffectiveDateRangeError,
  getNetVsGrossWeightError,
} from "./supplyChainValidation";

describe("supply chain validation rules", () => {
  it("rejects net weight above gross weight", () => {
    expect(getNetVsGrossWeightError("5.1", "5")).toBe(
      "Net weight cannot exceed gross weight.",
    );
    expect(getNetVsGrossWeightError("5", "5.1")).toBe("");
  });

  it("rejects an effective end date before its start date", () => {
    expect(getEffectiveDateRangeError("2026-07-28", "2026-07-27")).toBe(
      "Effective to must be on or after effective from.",
    );
    expect(getEffectiveDateRangeError("2026-07-28", "2026-07-28")).toBe("");
  });
});
