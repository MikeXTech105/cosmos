import { describe, expect, it, vi } from "vitest";
import { buildDowntimeAnalysis, loadDowntimeEntries } from "./downtimeAnalysis";

describe("downtime reason analysis", () => {
  it("groups machine/reason pairs and counts distinct days, not hours", () => {
    const rows = [
      { machineId: 1, downtimeReasonId: 3, productionDate: "2026-08-01" },
      { machineId: 1, downtimeReasonId: 3, productionDate: "2026-08-01" },
      { machineId: 2, downtimeReasonId: 3, productionDate: "2026-08-02" },
      { machineId: 2, downtimeReasonId: 0 },
    ];
    const result = buildDowntimeAnalysis(rows);
    expect(result.total).toBe(4);
    expect(result.recorded).toBe(3);
    expect(result.rows[0].count).toBe(2);
    expect(result.rows[0].days).toBe(1);
    expect(result.rows[0].percentage).toBeCloseTo(66.6667);
  });
  it("does not infer downtime from missing production or missing reasons", () => {
    expect(buildDowntimeAnalysis([]).rows).toEqual([]);
    expect(buildDowntimeAnalysis([{ shotCount: 0 }]).recorded).toBe(0);
  });
  it("loads all pages and keeps date parameters", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ data: { items: [{ id: 1 }], totalPages: 2 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 2 }], totalPages: 2 } });
    expect(await loadDowntimeEntries(fetchPage, { FromDate: "2026-08-01" })).toHaveLength(2);
    expect(fetchPage.mock.calls[1][0]).toMatchObject({ Page: 2, FromDate: "2026-08-01" });
  });
  it("rejects failures rather than returning partial totals", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({ data: { items: [{ id: 1 }], totalPages: 2 } }).mockRejectedValueOnce(new Error("Network error"));
    await expect(loadDowntimeEntries(fetchPage, {})).rejects.toThrow("Network error");
  });
  it("honours cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchPage = vi.fn();
    await expect(loadDowntimeEntries(fetchPage, {}, controller.signal)).rejects.toThrow("Cancelled");
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
