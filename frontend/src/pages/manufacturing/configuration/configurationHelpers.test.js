import { describe, expect, it } from "vitest";
import { isDecimal, lookupOptions, moveStep, validDateRange, validateIntervals, validateRouting, validateRoutingReferences } from "./configurationHelpers";

const validRoute = () => ({ revision: "R2", effectiveFrom: "2026-10-27", effectiveTo: "", steps: [{ operationId: "12", workCentreId: "18", rateBasis: 1, rate: "0.000001", setupMinutes: "0", quantityBasis: "100" }] });
describe("production configuration evidence and sequence validation", () => {
  it("preserves the smallest posting quantity and full 22 digit input without numeric coercion", () => {
    expect(isDecimal("9999999999999999.999999")).toBe(true);
    expect(isDecimal("0.000001")).toBe(true);
    for (const invalid of ["", "0", "-1", "1e3", "1,000", "0.0000001", "10000000000000000"]) expect(isDecimal(invalid)).toBe(false);
    expect(isDecimal("0", { allowZero: true })).toBe(true);
    expect(isDecimal("1.000001", { atMostOne: true })).toBe(false);
    expect(isDecimal("0.999999", { atMostOne: true })).toBe(true);
  });
  it("rejects invalid dates and inverted effective ranges, including dates JS rolls into another month", () => {
    expect(validDateRange("2026-02-30", "")).toBe(false);
    expect(validDateRange("2026-10-28", "2026-10-27")).toBe(false);
    expect(validDateRange("2028-02-29", "2028-02-29")).toBe(true);
  });
  it("requires verified shot resources and a quantity basis without inventing defaults", () => {
    const route = validRoute(); expect(validateRouting(route)).toBe("");
    route.steps[0].quantityBasis = ""; expect(validateRouting(route)).toContain("quantity basis");
    route.steps[0].quantityBasis = "1"; route.steps[0].rateBasis = 3; expect(validateRouting(route)).toContain("verified machine and mould");
    route.steps[0].machineId = "9"; route.steps[0].mouldId = "10"; expect(validateRouting(route)).toBe("");
  });
  it("reorders immutable routing steps and preserves operation identities", () => {
    const original = [{ operationId: 11 }, { operationId: 22 }, { operationId: 33 }];
    expect(moveStep(original, 1, -1).map((step) => step.operationId)).toEqual([22, 11, 33]);
    expect(original.map((step) => step.operationId)).toEqual([11, 22, 33]);
    expect(moveStep(original, 0, -1)).toBe(original);
  });
  it("blocks a previously selected resource after its lookup fails or permission is lost", () => {
    const form = validRoute();
    const lookups = { loading: false, error: "", operations: [{ id: 12, isActive: true }], workCentres: [{ id: 18, isActive: true }], machines: [{ id: "9007199254740993", isActive: true }], moulds: [], canReadMachines: true, canReadMoulds: true };
    expect(validateRoutingReferences(form, lookups)).toBe("");
    expect(validateRoutingReferences(form, { ...lookups, error: "Offline" })).toContain("Reload");
    form.steps[0].machineId = "9007199254740993";
    expect(validateRoutingReferences(form, { ...lookups, canReadMachines: false })).toContain("permitted active machine");
  });
  it("validates offset-aware overnight windows and cross-kind overlaps", () => {
    const interval = { from: "2026-10-27T23:45:00+05:30", to: "2026-10-28T00:15:00+05:30", reason: "Break" };
    expect(validateIntervals([interval])).toBe("");
    expect(validateIntervals([{ ...interval, from: "2026-10-27T23:45:00" }])).toContain("explicit UTC offsets");
    expect(validateIntervals([interval, { from: "2026-10-27T18:20:00Z", to: "2026-10-27T19:00:00Z", reason: "Downtime" }])).toContain("overlap");
    expect(validateIntervals([{ ...interval, reason: " " }])).not.toBe("");
  });
  it("excludes inactive choices while retaining an inactive historical selection", () => {
    expect(lookupOptions([{ id: 1, name: "Inactive", isActive: false }, { id: 250, name: "Verified", isActive: true }])).toEqual([{ id: 250, name: "Verified", isActive: true, value: 250, label: "Verified", disabled: false }]);
    expect(lookupOptions([{ id: 1, name: "Inactive", isActive: false }], "1")).toEqual([{ id: 1, name: "Inactive", isActive: false, value: 1, label: "Inactive (inactive)", disabled: true }]);
  });
});
