import { describe, expect, it } from "vitest";
import { companyClock, completionSeed, pasteQuantities, setupMessage, transitionAction } from "./deskHelpers";
const row = { id: "9223372036854775806", status: 2, version: "v1", remainingQuantity: "9999999999999999.999999" };
const runtime = { businessDate: "2026-10-28", browserTimeZone: "Asia/Kolkata" };
describe("daily production entry contracts", () => {
  it("preserves sheet digits, blank positions and record identity without partial application", () => {
    const rows = [row, { ...row, id: "9223372036854775807" }], source = {};
    const next = pasteQuantities(rows, 0, 0, "9999999999999999.999998\t0.000001\r\n\t2.000001\r\n", source);
    expect(next[row.id]).toEqual({ version: "v1", goodOutput: "9999999999999999.999998", rejectedOutput: "0.000001" });
    expect(next[rows[1].id].goodOutput).toBe("");
    expect(source).toEqual({});
    expect(() => pasteQuantities(rows, 0, 0, "1\t0\ninvalid\t0", source)).toThrow();
    expect(source).toEqual({});
  });
  it("refuses overflowing, read-only and stale rows rather than clipping the paste", () => {
    expect(() => pasteQuantities([row], 0, 1, "1\t2", {})).toThrow("visible rows");
    expect(() => pasteQuantities([{ ...row, status: 4 }], 0, 0, "1\t0", {})).toThrow("ready for production");
    expect(() => pasteQuantities([row], 0, 0, "1\t0", { [row.id]: { version: "old" } })).toThrow("changed");
  });
  it("uses the verified company clock, explicit offset, exact quantities and fresh version", () => {
    const seed = completionSeed(row, { version: "v1", goodOutput: "9999999999999999.999998", rejectedOutput: "0.000001" }, "2026-10-28", "23:59", runtime);
    expect(seed.occurredAt).toBe("2026-10-28T23:59:00+05:30");
    expect(seed.goodOutput).toBe("9999999999999999.999998");
    expect(companyClock(runtime.browserTimeZone, new Date("2026-10-27T20:00:00Z"))).toBe("01:30");
    expect(companyClock("invalid-backend-zone")).toBe("");
    expect(() => completionSeed(row, { goodOutput: "1" }, "2026-10-28", "12:00", null)).toThrow("company");
    expect(() => completionSeed(row, { version: "v0", goodOutput: "1" }, "2026-10-28", "12:00", runtime)).toThrow("changed");
  });
  it("rejects future, over-remainder, missing and closed entries", () => {
    const current = { ...row, remainingQuantity: "1" };
    expect(() => completionSeed(current, { goodOutput: "1", rejectedOutput: "0.000001" }, "2026-10-28", "12:00", runtime)).toThrow("remaining");
    expect(() => completionSeed(current, { goodOutput: "1" }, "2026-10-29", "12:00", runtime)).toThrow("future");
    expect(() => completionSeed(current, {}, "2026-10-28", "12:00", runtime)).toThrow();
    expect(() => completionSeed({ ...current, status: 5 }, { goodOutput: "1" }, "2026-10-28", "12:00", runtime)).toThrow("released");
  });
  it("Kanban opens actual review commands and never invents a direct status mutation", () => {
    expect(transitionAction({ status: 1 }, 2)).toBe("release");
    expect(transitionAction({ status: 2 }, 3)).toBe("complete");
    expect(transitionAction({ status: 3 }, 4)).toBe("complete");
    expect(transitionAction({ status: 4 }, 5)).toBe("close");
    expect(transitionAction({ status: 2 }, 6)).toBe("cancel");
    expect(transitionAction({ status: 3 }, 3)).toBeNull();
    expect(() => transitionAction({ status: 6 }, 2)).toThrow();
    expect(() => transitionAction({ status: 1 }, 4)).toThrow();
  });
  it("explains missing setup without pretending a different authenticated company is valid", () => {
    expect(setupMessage("Manufacturing catalog company scope is not configured.")).toContain("administrator");
    expect(setupMessage("The authenticated company does not match this catalog.")).toContain("Sign out");
    expect(setupMessage("Material balance unavailable")).toBe("Material balance unavailable");
  });
});
