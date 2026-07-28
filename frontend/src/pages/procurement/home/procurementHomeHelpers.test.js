import { describe, expect, it } from "vitest";

import {
  getCalculationSteps,
  getPlanningLineCover,
  getPlanningLineStatus,
  getPlanningLineToOrder,
  sortPlanningLines,
} from "./procurementHomeHelpers";

describe("procurement Home presentation helpers", () => {
  it("uses the server final quantity as the buy quantity", () => {
    expect(
      getPlanningLineToOrder({
        calculatedSuggestedQuantity: 12,
        finalQuantity: 20,
      }),
    ).toBe(20);
  });

  it("never derives cover when the server omitted it", () => {
    expect(
      getPlanningLineCover({ averageDailyUsage: 2, physicalStock: 20 }),
    ).toBeNull();
  });

  it("sorts order-now lines by server-reported shortfall", () => {
    const lines = [
      { finalQuantity: 4, itemCode: "LOW", shortage: 2 },
      { finalQuantity: 8, itemCode: "HIGH", shortage: 9 },
      { finalQuantity: 0, itemCode: "OK", shortage: 0 },
    ];

    expect(sortPlanningLines(lines).map((line) => line.itemCode)).toEqual([
      "HIGH",
      "LOW",
      "OK",
    ]);
  });

  it("marks any positive server buy quantity as order now", () => {
    expect(getPlanningLineStatus({ finalQuantity: 1 }).label).toBe("Order now");
  });

  it("uses server-provided projected availability for watch status", () => {
    expect(
      getPlanningLineStatus({
        finalQuantity: 0,
        physicalStock: 2,
        projectedAvailableStock: 20,
        reorderPoint: 10,
        shortage: 0,
      }).label,
    ).toBe("OK");
  });

  it("builds the calculation strip from supplied DTO fields", () => {
    const steps = getCalculationSteps({
      averageDailyUsage: 3,
      inboundStock: 4,
      leadTimeDays: 5,
      leadTimeDemand: 15,
      physicalStock: 6,
      projectedAvailableStock: 10,
      finalQuantity: 9,
    });

    expect(steps.find((step) => step.key === "lead-demand")?.value).toBe(15);
    expect(steps.find((step) => step.key === "inbound-stock")?.value).toBe(4);
    expect(steps.find((step) => step.key === "projected-available")?.value).toBe(
      10,
    );
    expect(steps.find((step) => step.key === "to-order")?.value).toBe(9);
  });
});
