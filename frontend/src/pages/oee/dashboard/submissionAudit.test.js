import { describe, expect, it } from "vitest";
import { loadDowntimeEntries } from "./downtimeAnalysis";
import {
  auditTimestamp,
  calendarAuditDays,
  groupSubmissionDays,
} from "./submissionAudit";
const now = Date.parse("2026-10-22T12:00:00Z");
const row = (id, machineId, productionDate, createdAt, extra = {}) => ({
  id,
  machineId,
  machineCode: `IM-${machineId}`,
  productionDate,
  createdAt,
  shotCount: 100,
  calculatedTargetShot: 200,
  ...extra,
});
describe("daily submission grouping", () => {
  it("keeps explicit stopped-day evidence separate from missing data and performance readings", () => {
    const acknowledgements = [
      { id: 1, productionDate: "2026-10-18", machineId: 1, state: "PlannedStop", reason: "Scheduled maintenance" },
      { id: 2, productionDate: "2026-10-19", machineId: 1, state: "Withdrawn", reason: "Machine ran" },
    ];
    const groups = groupSubmissionDays([], "weighted", 3, now, acknowledgements);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ date: "2026-10-18", status: "acknowledged", acknowledgedMachines: 1, count: 0, value: null, rows: [] });
    const calendar = calendarAuditDays(groups, "2026-10-17", "2026-10-19", 0, now);
    expect(calendar.map(day => day.status)).toEqual(["unlogged", "acknowledged", "unlogged"]);
    expect(groups[0].acknowledgements[0].reason).toBe("Scheduled maintenance");
  });
  it("keeps one complete date when its machine entries cross API pages", async () => {
    const entries = Array.from({ length: 205 }, (_, index) =>
      row(index + 1, index + 1, "2026-09-17", "2026-09-18T08:00:00Z"),
    );
    entries.push(row(206, 1, "2026-10-17", "2026-10-18T08:00:00Z"));
    const loaded = await loadDowntimeEntries(
      async ({ Page, PageSize }) => ({
        data: {
          items: entries.slice((Page - 1) * PageSize, Page * PageSize),
          totalPages: 2,
          totalCount: 206,
        },
      }),
      {},
    );
    const days = groupSubmissionDays(loaded, "weighted", 3, now);
    expect(days.map((day) => day.date)).toEqual(["2026-10-17", "2026-09-17"]);
    expect(days[1]).toMatchObject({
      count: 205,
      machines: 205,
      shots: 20500,
      target: 41000,
      value: 50,
    });
    expect(days[1].rows).toHaveLength(205);
  });
  it("turns five machine entries on one date into one daily record", () => {
    const entries = Array.from({ length: 5 }, (_, index) =>
      row(index + 1, index + 1, "2026-09-17", "2026-09-18T08:00:00Z"),
    );
    const days = groupSubmissionDays(entries, "weighted", 3, now);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      date: "2026-09-17",
      count: 5,
      machines: 5,
      shots: 500,
      target: 1000,
      value: 50,
    });
    expect(days[0].duplicates).toHaveLength(0);
    expect(days[0].rows).toHaveLength(5);
  });
  it("flags repeated machine/date pairs, not different machines on a date", () => {
    const days = groupSubmissionDays(
      [
        row(1, 1, "2026-09-17", "2026-09-18T08:00:00Z"),
        row(2, 1, "2026-09-17", "2026-09-18T09:00:00Z"),
        row(3, 2, "2026-09-17", "2026-09-18T09:00:00Z"),
      ],
      "weighted",
      3,
      now,
    );
    expect(days[0].duplicates).toHaveLength(1);
    expect(days[0].duplicates[0]).toHaveLength(2);
    expect(days[0].machines).toBe(2);
  });
  it("uses midnight IST after production day and the last saved machine timestamp", () => {
    const days = groupSubmissionDays(
      [
        row(1, 1, "2026-09-17", "2026-09-17T18:30:00Z"),
        row(2, 2, "2026-09-17", "2026-09-20T18:30:00Z"),
      ],
      "weighted",
      3,
      now,
    );
    expect(days[0].latency).toBe(3);
    expect(days[0].status).toBe("ontime");
    const late = groupSubmissionDays(
      [row(1, 1, "2026-09-17", "2026-09-20T18:30:01Z")],
      "weighted",
      3,
      now,
    );
    expect(late[0].status).toBe("delayed");
  });
  it("does not count missing or future timestamps as on time", () => {
    const days = groupSubmissionDays(
      [
        row(1, 1, "2026-09-17", null),
        row(2, 2, "2026-09-17", "2026-11-01T00:00:00Z"),
      ],
      "weighted",
      3,
      now,
    );
    expect(days[0].status).toBe("unknown");
    expect(days[0].last).toBeNull();
    expect(days[0].latency).toBeNull();
  });
  it("interprets zone-less database CreatedAt as UTC and respects explicit offsets", () => {
    expect(auditTimestamp("2026-09-17T18:30:00")).toBe(
      Date.parse("2026-09-17T18:30:00Z"),
    );
    expect(auditTimestamp("2026-09-18T00:00:00+05:30")).toBe(
      Date.parse("2026-09-17T18:30:00Z"),
    );
    expect(auditTimestamp("not-a-date")).toBeNull();
  });
  it("retains day-specific records and descending date order", () => {
    const days = groupSubmissionDays(
      [
        row(1, 1, "2026-08-17", "2026-08-18T00:00:00Z"),
        row(2, 1, "2026-09-17", "2026-09-18T00:00:00Z"),
      ],
      "weighted",
      3,
      now,
    );
    expect(days.map((day) => day.date)).toEqual(["2026-09-17", "2026-08-17"]);
    expect(days[0].rows.map((item) => item.id)).toEqual([2]);
  });
});
describe("submission calendar gaps", () => {
  it("distinguishes overdue gaps, days within the window, and the current open day", () => {
    const days = calendarAuditDays([], "2026-10-17", "2026-10-25", 3, now);
    expect(days.map((day) => day.date)).toHaveLength(6);
    expect(days.find((day) => day.date === "2026-10-17").status).toBe(
      "unlogged",
    );
    expect(days.find((day) => day.date === "2026-10-20").status).toBe(
      "pending",
    );
    expect(days.find((day) => day.date === "2026-10-22").status).toBe("open");
    expect(days.some((day) => day.date > "2026-10-22")).toBe(false);
  });
  it("keeps submitted days intact across month boundaries and includes date endpoints", () => {
    const groups = groupSubmissionDays(
      [row(1, 1, "2026-09-30", "2026-10-01T00:00:00Z")],
      "weighted",
      3,
      now,
    );
    const days = calendarAuditDays(groups, "2026-09-30", "2026-10-02", 3, now);
    expect(days).toHaveLength(3);
    expect(days[0]).toBe(groups[0]);
    expect(days[2].date).toBe("2026-10-02");
  });
  it("returns no inferred gaps for absent or reversed ranges", () => {
    expect(calendarAuditDays([], "", "", 3, now)).toEqual([]);
    expect(calendarAuditDays([], "2026-10-22", "2026-10-01", 3, now)).toEqual(
      [],
    );
  });
});
