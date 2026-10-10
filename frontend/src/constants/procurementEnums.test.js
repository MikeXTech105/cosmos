import { describe, expect, it } from "vitest";

import {
  isCancelledPlanningRunStatus,
  isFinalizedPlanningRunStatus,
  PLANNING_RUN_STATUS_LABELS,
  PLANNING_RUN_STATUS_OPTIONS,
  PlanningRunStatus,
} from "./procurementEnums";

describe("procurement planning-run enum contract", () => {
  it("deserializes every persisted planning-run status", () => {
    expect(PlanningRunStatus).toEqual({
      Draft: 1,
      Finalized: 2,
      Calculated: 3,
      Reviewed: 4,
      Cancelled: 5,
    });
    expect(PLANNING_RUN_STATUS_LABELS).toEqual({
      1: "Draft",
      2: "Finalized",
      3: "Calculated",
      4: "Reviewed",
      5: "Cancelled",
    });
    expect(PLANNING_RUN_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("does not treat Calculated or Reviewed runs as cancelled or finalized", () => {
    expect(isFinalizedPlanningRunStatus(PlanningRunStatus.Finalized)).toBe(true);
    expect(isCancelledPlanningRunStatus(PlanningRunStatus.Cancelled)).toBe(true);
    expect(isCancelledPlanningRunStatus(PlanningRunStatus.Calculated)).toBe(false);
    expect(isCancelledPlanningRunStatus(PlanningRunStatus.Reviewed)).toBe(false);
  });
});
