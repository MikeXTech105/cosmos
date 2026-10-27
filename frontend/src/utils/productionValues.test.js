import { describe, expect, it } from "vitest";
import { addDecimal, assertBusinessDate, compareDecimal, dateTimeOffset, decimalText, decimalWire, idWire, quantityText, subtractDecimal } from "./productionValues";
import { parseProductionJson, serializeProductionJson } from "../services/manufacturing/productionApi";

describe("production decimal wire contract", () => {
  it("round trips the complete posting range as raw numeric JSON tokens", () => {
    const raw = serializeProductionJson({ quantity: decimalWire("9999999999999999.999999"), id: idWire("9223372036854775807"), scrap: decimalWire("0.000001") });
    expect(raw).toBe('{"quantity":9999999999999999.999999,"id":9223372036854775807,"scrap":0.000001}');
    expect(parseProductionJson(raw)).toEqual({ quantity: "9999999999999999.999999", id: "9223372036854775807", scrap: "0.000001" });
    expect(serializeProductionJson(raw)).toBe(raw); // auth refresh replays the identical serialized request
  });
  it("preserves source scale twelve, nulls, zeros, percentages and exponent evidence", () => {
    const source = serializeProductionJson({ quantity: decimalWire("1234567890123456.123456789012", { scale: 12 }), missing: null });
    expect(parseProductionJson(source).quantity).toBe("1234567890123456.123456789012");
    expect(parseProductionJson('{"zero":0,"missing":null,"wastePercent":0.5}')).toEqual({ zero: 0, missing: null, wastePercent: "0.5" });
    expect(quantityText("0.000001")).toBe("0.000001");
    expect(quantityText(null)).toBe("—"); expect(quantityText(0)).toBe("0");
    expect(quantityText("9999999999999999.999999")).toBe("9,999,999,999,999,999.999999");
    expect(decimalText("1e-6")).toBe("0.000001");
  });
  it("rejects rounded native numbers, excess posting scale, invalid IDs and negative unsigned commands", () => {
    expect(() => decimalWire(Number("99999999999999999"))).toThrow(); expect(() => idWire(9007199254740992)).toThrow();
    expect(() => idWire("9223372036854775808")).toThrow(); expect(() => decimalWire("0.0000001")).toThrow();
    expect(() => decimalWire("-1")).toThrow(); expect(() => decimalWire("0", { positive: true })).toThrow();
    expect(serializeProductionJson(decimalWire("-0.000001", { nonNegative: false }))).toBe("-0.000001");
  });
  it("performs comparisons and reservation differences without binary rounding", () => {
    expect(subtractDecimal("9999999999999999.999999", "9999999999999999.999998")).toBe("0.000001");
    expect(addDecimal("0.1", "0.2")).toBe("0.3"); expect(compareDecimal("1.000001", "1")).toBe(1);
  });
});
describe("company dates and explicit offsets", () => {
  it("keeps business dates and rejects closed or impossible days", () => {
    expect(assertBusinessDate("2026-10-27", { closedThroughDate: "2026-10-26" })).toBe("2026-10-27");
    expect(() => assertBusinessDate("2026-10-26", { closedThroughDate: "2026-10-26" })).toThrow();
    expect(() => assertBusinessDate("2026-02-30")).toThrow();
  });
  it("keeps the company date across UTC midnight and overnight shifts", () => {
    expect(dateTimeOffset("2026-10-27", "00:15", "Asia/Kolkata")).toBe("2026-10-27T00:15:00+05:30");
    expect(dateTimeOffset("2026-10-28", "01:15", "Asia/Kolkata")).toBe("2026-10-28T01:15:00+05:30");
    expect(() => dateTimeOffset("2026-10-27", "24:30", "Asia/Kolkata")).toThrow();
  });
  it("requires an explicit offset when local clock time is ambiguous or absent", () => {
    expect(() => dateTimeOffset("2026-11-01", "01:30", "America/New_York")).toThrow(/ambiguous/);
    expect(() => dateTimeOffset("2026-03-08", "02:30", "America/New_York")).toThrow(/missing/);
  });
});
