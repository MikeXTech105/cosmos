import { describe, expect, it } from "vitest";
import {
  buildInsights,
  comparisonRange,
  indiaToday,
  insightPreset,
  insightSummary,
  metricChange,
} from "./productionInsights";

const row = (id, machineId, productionDate, shotCount, target, extra = {}) => ({
  id,
  machineId,
  machineCode: `IM-${machineId}`,
  machineName: `Machine ${machineId}`,
  productionDate,
  shotCount,
  calculatedTargetShot: target,
  downtimeReasonName: "NONE",
  ...extra,
});
describe("production insight periods", () => {
  it("compares inclusive periods with the immediately preceding equal number of days", () => {
    expect(
      comparisonRange({ fromDate: "2026-09-23", toDate: "2026-10-22" }),
    ).toEqual({ fromDate: "2026-08-24", toDate: "2026-09-22", days: 30 });
    expect(
      comparisonRange({ fromDate: "2024-03-01", toDate: "2024-03-01" }),
    ).toEqual({ fromDate: "2024-02-29", toDate: "2024-02-29", days: 1 });
  });
  it("rejects reversed and impossible dates", () => {
    expect(
      comparisonRange({ fromDate: "2026-02-30", toDate: "2026-03-01" }),
    ).toBeNull();
    expect(
      comparisonRange({ fromDate: "2026-03-01", toDate: "2026-02-28" }),
    ).toBeNull();
    expect(comparisonRange({ fromDate: "", toDate: "2026-03-01" })).toBeNull();
  });
  it("uses IST at the day boundary, independent of the host timezone", () => {
    const now = Date.parse("2026-10-21T19:00:00Z");
    expect(indiaToday(now)).toBe("2026-10-22");
    expect(insightPreset("thisMonth", now)).toEqual({
      fromDate: "2026-10-01",
      toDate: "2026-10-22",
    });
    expect(insightPreset("lastMonth", now)).toEqual({
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
    });
    expect(insightPreset("last7", now)).toEqual({
      fromDate: "2026-10-16",
      toDate: "2026-10-22",
    });
  });
});
describe("truthful production metrics", () => {
  it("excludes missing targets and invalid shots from achievement, while retaining valid production totals", () => {
    const summary = insightSummary([
      row(1, 1, "2026-10-08", 50, 100),
      row(2, 2, "2026-10-08", 500, 0),
      row(3, 3, "2026-10-08", null, 100),
      row(4, 4, "2026-10-08", -10, 100),
    ]);
    expect(summary).toMatchObject({
      actual: 550,
      matchedActual: 50,
      target: 100,
      achievement: 50,
      eligible: 1,
      noTarget: 1,
      invalidShots: 2,
      count: 4,
    });
  });
  it("preserves above-target scores and distinguishes gross reading loss from net shortfall", () => {
    const summary = insightSummary([
      row(1, 1, "2026-10-08", 40, 100),
      row(2, 2, "2026-10-08", 200, 100),
    ]);
    expect(summary).toMatchObject({
      achievement: 120,
      grossShortfall: 60,
      netShortfall: 0,
      overTarget: 40,
    });
  });
  it("does not label missing records as zero achievement or zero shortfall", () => {
    expect(insightSummary([])).toMatchObject({
      count: 0,
      achievement: null,
      netShortfall: null,
      lastSaved: null,
    });
    expect(metricChange(10, 0)).toMatchObject({
      value: null,
      text: "No non-zero baseline",
    });
    expect(metricChange(10, 50, { available: false })).toMatchObject({
      value: null,
    });
    expect(metricChange(null, 50)).toMatchObject({ value: null });
  });
  it("uses percentage points for achievement, and relative percentages for volume", () => {
    expect(metricChange(90, 75, { points: true })).toEqual({
      value: 15,
      text: "pp",
    });
    expect(metricChange(90, 75)).toEqual({ value: 20, text: "%" });
    expect(metricChange(0, 0)).toEqual({ value: 0, text: "%" });
  });
  it("counts repeated machine/date pairs without treating different machines as duplicates", () => {
    const rows = [
      row(1, 1, "2026-10-08", 50, 100),
      row(2, 2, "2026-10-08", 50, 100),
      row(3, 2, "2026-10-08", 50, 100),
    ];
    expect(insightSummary(rows)).toMatchObject({
      duplicates: 1,
      problems: 0,
      machines: 2,
      days: 1,
    });
  });
  it("uses the last saved or updated UTC timestamp", () => {
    const rows = [
      row(1, 1, "2026-10-08", 50, 100, {
        createdAt: "2026-10-09T10:00:00",
        updatedAt: "2026-10-10T10:00:00Z",
      }),
    ];
    expect(insightSummary(rows).lastSaved).toBe(
      Date.parse("2026-10-10T10:00:00Z"),
    );
  });
});
describe("machine priorities and comparison trend", () => {
  it("ranks machines by reading shortfalls, retains baseline-only machines, and flags saved reasons", () => {
    const data = buildInsights(
      [
        row(1, 1, "2026-10-08", 90, 100),
        row(2, 2, "2026-10-08", 50, 100),
        row(3, 3, "2026-10-08", 100, 100, {
          downtimeReasonName: "LIGHT CHALI GAYI",
        }),
      ],
      [row(4, 4, "2026-10-07", 100, 100)],
      { fromDate: "2026-10-08", toDate: "2026-10-08" },
    );
    expect(data.attention.map((item) => item.id)).toEqual(["2", "1", "3"]);
    expect(data.machines.find((item) => item.id === "4")).toMatchObject({
      count: 0,
      achievement: null,
      needsAttention: false,
    });
    expect(data.attention.find((item) => item.id === "3").reasons).toEqual([
      "LIGHT CHALI GAYI",
    ]);
  });
  it("keeps missing days null, saved zero shots zero, and comparison dates explicitly aligned", () => {
    const data = buildInsights(
      [row(1, 1, "2026-10-02T00:00:00", 0, 100)],
      [row(2, 1, "2026-09-30", 50, 100)],
      { fromDate: "2026-10-01", toDate: "2026-10-02" },
    );
    expect(data.trend).toEqual([
      {
        date: "2026-10-01",
        priorDate: "2026-09-29",
        actual: null,
        target: null,
        previous: null,
        count: 0,
      },
      {
        date: "2026-10-02",
        priorDate: "2026-09-30",
        actual: 0,
        target: 100,
        previous: 50,
        count: 1,
      },
    ]);
  });
});
