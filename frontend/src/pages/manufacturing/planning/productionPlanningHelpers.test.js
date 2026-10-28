import { describe, expect, it } from "vitest";
import { freshnessLabel, selectablePlanningLine } from "./productionPlanningHelpers";

describe("planning freshness and physical output eligibility", () => {
  it("keeps stale, missing and explicit no-demand rows distinct from selectable current evidence", () => {
    expect(selectablePlanningLine({ freshness: 1, suggestedProduction: "0.000001" })).toBe(true);
    for (const freshness of [2, 3, 4]) expect(selectablePlanningLine({ freshness, suggestedProduction: "100" })).toBe(false);
    expect(selectablePlanningLine({ freshness: 1, suggestedProduction: null })).toBe(false);
    expect(selectablePlanningLine({ freshness: 1, suggestedProduction: "0" })).toBe(false);
    expect(freshnessLabel(2)).toBe("Stale");
    expect(freshnessLabel(3)).toBe("Missing");
    expect(freshnessLabel(4)).toBe("No demand");
  });
});
