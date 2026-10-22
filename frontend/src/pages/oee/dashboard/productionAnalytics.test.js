import { describe, expect, it, vi } from "vitest";
import {
  buildProductionAnalytics,
  hasRecordedProblem,
  readingRatio,
  selectReadings,
  summarizeReadings,
} from "./productionAnalytics";
import { loadDowntimeEntries } from "./downtimeAnalysis";
const row = (
  id,
  machineId,
  productionDate,
  shotCount,
  calculatedTargetShot,
  rest = {},
) => ({
  id,
  machineId,
  machineName: `Machine ${machineId}`,
  mouldId: 1,
  mouldName: "Mould A",
  productionDate,
  shotCount,
  calculatedTargetShot,
  ...rest,
});

describe("production dashboard calculations", () => {
  it("keeps the weighted ERP ratio distinct from the Sheet reading average", () => {
    const rows = [
      row(1, 1, "2026-10-01", 100, 100),
      row(2, 1, "2026-10-02", 100, 400),
    ];
    expect(summarizeReadings(rows).value).toBe(40);
    expect(summarizeReadings(rows, "mean").value).toBe(62.5);
  });
  it("does not turn a missing or zero target into a critical 0% reading", () => {
    expect(
      readingRatio({ shotCount: 12, calculatedTargetShot: null }),
    ).toBeNull();
    expect(readingRatio({ shotCount: 12, calculatedTargetShot: 0 })).toBeNull();
    expect(readingRatio({ shotCount: 0, calculatedTargetShot: 100 })).toBe(0);
    expect(summarizeReadings([]).value).toBeNull();
    expect(summarizeReadings([row(1, 1, "2026-10-01", 0, 0)]).mean).toBeNull();
    expect(
      readingRatio({ shotCount: undefined, calculatedTargetShot: 100 }),
    ).toBeNull();
  });
  it("retains above-target values and a nonnegative net shortfall", () => {
    const result = summarizeReadings([row(1, 1, "2026-10-01", 140, 100)]);
    expect(result.value).toBe(140);
    expect(result.gap).toBe(0);
  });
  it("selects the latest eligible N independently for each machine, with deterministic ties", () => {
    const rows = [
      row(1, 1, "2026-01-01", 90, 100),
      row(2, 1, "2026-09-01", 0, 0),
      row(3, 1, "2026-01-01", 70, 100),
      row(4, 2, "2025-01-01", 50, 100),
    ];
    expect(
      selectReadings(rows, { mode: "readings", limit: 1 }).map(
        (item) => item.id,
      ),
    ).toEqual([3, 4]);
  });
  it("applies machine and mould scope before selecting latest readings", () => {
    const rows = [
      row(1, 1, "2026-01-01", 90, 100),
      row(2, 1, "2026-09-01", 70, 100, { mouldId: 2 }),
      row(3, 2, "2026-10-01", 50, 100),
    ];
    expect(
      selectReadings(rows, {
        machine: "1",
        mould: "1",
        mode: "readings",
        limit: 1,
      }).map((item) => item.id),
    ).toEqual([1]);
    expect(selectReadings(rows, { machine: "1" })).toHaveLength(2);
  });
  it("uses the same rows and calculation for machine, mould and daily charts", () => {
    const data = buildProductionAnalytics(
      [
        row(1, 1, "2026-10-02", 100, 100),
        row(2, 1, "2026-10-02", 100, 400),
        row(3, 2, "2026-10-01", 0, 0),
      ],
      "mean",
    );
    expect(data.summary.count).toBe(3);
    expect(data.summary.value).toBe(62.5);
    expect(data.machines[0].value).toBe(62.5);
    expect(data.moulds[0].value).toBe(62.5);
    expect(data.trend[0].name).toBe("2026-10-01");
    expect(data.trend[0].value).toBeNull();
    expect(data.trend[1].value).toBe(62.5);
  });
  it("excludes NONE and missing reasons without claiming to measure hours", () => {
    expect(
      hasRecordedProblem({ downtimeReasonId: 1, downtimeReasonName: " NONE " }),
    ).toBe(false);
    expect(hasRecordedProblem({ downtimeReasonName: "N/A" })).toBe(false);
    expect(hasRecordedProblem({})).toBe(false);
    const data = buildProductionAnalytics([
      row(1, 1, "2026-10-01", 0, 100, { downtimeReasonName: "Power cut" }),
      row(2, 2, "2026-10-01", 0, 100, { downtimeReasonName: "Power cut" }),
      row(3, 1, "2026-10-02", 50, 100, { downtimeReasonName: "NONE" }),
    ]);
    expect(data.summary.problems).toBe(2);
    expect(data.reasons[0]).toMatchObject({ count: 2, days: 1, share: 100 });
  });
  it("keeps compound recorded reason names intact", () => {
    expect(
      buildProductionAnalytics([
        row(1, 1, "2026-10-01", 0, 100, {
          downtimeReasonName: "Power cut, Mould issue",
        }),
      ]).reasons,
    ).toHaveLength(1);
  });
  it("does not silently truncate trends at thirty dates", () => {
    const data = buildProductionAnalytics(
      Array.from({ length: 40 }, (_, i) =>
        row(
          i,
          1,
          `2026-${i < 30 ? "09" : "10"}-${String((i % 30) + 1).padStart(2, "0")}`,
          1,
          1,
        ),
      ),
    );
    expect(data.trend).toHaveLength(40);
  });
});

describe("complete production dataset loading", () => {
  it("rejects a truncated response even when it declares the last page", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        data: { items: [{ id: 1 }], totalPages: 1, totalCount: 2 },
      });
    await expect(loadDowntimeEntries(fetch, {})).rejects.toThrow(
      "Incomplete production data",
    );
  });
  it("rejects changing pagination totals instead of mixing snapshots", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        data: { items: [{ id: 1 }], totalPages: 2, totalCount: 2 },
      })
      .mockResolvedValueOnce({
        data: { items: [{ id: 2 }], totalPages: 2, totalCount: 3 },
      });
    await expect(loadDowntimeEntries(fetch, {})).rejects.toThrow(
      "changed while loading",
    );
  });
  it("rejects repeated rows across pages", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ data: { items: [{ id: 1 }], totalPages: 2 } });
    await expect(loadDowntimeEntries(fetch, {})).rejects.toThrow(
      "changed while loading",
    );
  });
  it("treats absent pagination as unknown, rather than zero pages", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          items: Array.from({ length: 200 }, (_, id) => ({ id })),
          totalPages: null,
        },
      })
      .mockResolvedValueOnce({
        data: { items: [{ id: 200 }], totalPages: null },
      });
    expect(await loadDowntimeEntries(fetch, {})).toHaveLength(201);
  });
});
