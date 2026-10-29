import { describe, expect, it, vi } from "vitest";
import { loadSubmissionMonth, shiftSubmissionMonth, submissionMonthDays, submissionMonthRange, submissionToday, validSubmissionDate } from "./submissionCalendar";

describe("daily entry month coverage", () => {
  it("uses the business timezone at midnight, and builds leap and year boundaries", () => {
    expect(submissionToday(new Date("2026-10-28T19:00:00Z"))).toBe("2026-10-29");
    expect(submissionMonthRange("2024-02")).toEqual({ fromDate: "2024-02-01", toDate: "2024-02-29" });
    expect(submissionMonthRange("2026-02").toDate).toBe("2026-02-28");
    expect(shiftSubmissionMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftSubmissionMonth("2026-01", -1)).toBe("2025-12");
    expect(submissionMonthRange("2026-13")).toBeNull();
    expect(validSubmissionDate("2026-02-29")).toBe(false);
    expect(validSubmissionDate("2024-02-29")).toBe(true);
    expect(validSubmissionDate("")).toBe(false);
  });

  it("counts saved dates once, separates today/future, and excludes other months", () => {
    const result = submissionMonthDays({ month: "2026-10", today: "2026-10-03", complete: true, entries: [{ date: "2026-10-01" }, { date: "2026-10-01T00:00:00" }, { date: "2026-09-30" }], getDate: row => row.date });
    expect(result.saved).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.upcoming).toBe(28);
    expect(result.totalEntries).toBe(2);
    expect(result.offset).toBe(3); // Thursday in a Monday-first calendar.
    expect(result.days[2].status).toBe("today");
    expect(result.days[3].status).toBe("future");
  });

  it("never labels unchecked dates missing", () => {
    const result = submissionMonthDays({ month: "2026-09", today: "2026-10-29", complete: false, getDate: row => row.date });
    expect(result.pending).toBe(0);
    expect(result.days.every(day => day.status === "unknown")).toBe(true);
  });
});

describe("whole-month paging", () => {
  it("loads later pages even when the server caps the requested page size", async () => {
    const loadPage = vi.fn(async ({ pageNumber }) => ({ items: pageNumber === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }], totalCount: 3, pageNumber, pageSize: 2 }));
    expect(await loadSubmissionMonth({ month: "2026-10", loadPage })).toHaveLength(3);
    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(loadPage.mock.calls[1][0]).toMatchObject({ fromDate: "2026-10-01", toDate: "2026-10-31", pageNumber: 2 });
  });

  it("rejects incomplete later pages and changing totals", async () => {
    const incomplete = vi.fn(async ({ pageNumber }) => ({ items: pageNumber === 1 ? [{ id: 1 }] : [], totalCount: 2, pageNumber, pageSize: 1 }));
    await expect(loadSubmissionMonth({ month: "2026-10", loadPage: incomplete })).rejects.toThrow(/unavailable/);
    const changing = vi.fn(async ({ pageNumber }) => ({ items: [{ id: pageNumber }], totalCount: pageNumber === 1 ? 2 : 3, pageNumber, pageSize: 1 }));
    await expect(loadSubmissionMonth({ month: "2026-10", loadPage: changing })).rejects.toThrow(/changed/);
  });

  it("fails repeated pages and propagates a later page failure instead of partial data", async () => {
    await expect(loadSubmissionMonth({ month: "2026-10", loadPage: async () => ({ items: [{ id: 1 }], totalCount: 2, pageSize: 1 }) })).rejects.toThrow(/repeated/);
    const failure = vi.fn(async ({ pageNumber }) => { if (pageNumber === 2) throw new Error("Network unavailable"); return { items: [{ id: 1 }], totalCount: 2, pageSize: 1 }; });
    await expect(loadSubmissionMonth({ month: "2026-10", loadPage: failure })).rejects.toThrow("Network unavailable");
  });

  it("stops when aborted so an obsolete month cannot keep loading", async () => {
    const controller = new AbortController();
    const loadPage = vi.fn(async () => { controller.abort(); return { items: [], totalCount: 0 }; });
    await expect(loadSubmissionMonth({ month: "2026-10", loadPage, signal: controller.signal })).rejects.toThrow();
    expect(loadPage).toHaveBeenCalledOnce();
  });
});
