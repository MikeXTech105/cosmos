import { beforeEach, describe, expect, it, vi } from "vitest";
import { stringify } from "lossless-json";
import productionApi from "./productionApi";
import { productionConfigurationService as service } from "./productionConfigurationService";

vi.mock("./productionApi", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of ["get", "post", "put"]) productionApi[method].mockResolvedValue({ data: { succeeded: true, data: { id: 99, version: "v2" } } });
});
describe("configuration real route and exact numeric contracts", () => {
  it("sends an exact numeric token for large identifiers, rate and quantity basis", async () => {
    await service.createRouting(12, { revision: "R1", effectiveFrom: "2026-10-27", effectiveTo: null, steps: [{ sequence: 1, operationId: "9007199254740993", workCentreId: "22", rateBasis: 1, rate: "9999999999999999.999999", setupMinutes: "0", quantityBasis: "0.000001", machineId: null, mouldId: null }] });
    const [path, payload] = productionApi.post.mock.calls[0];
    expect(path).toBe("/api/v1/manufacturing/items/12/routings");
    expect(stringify(payload)).toContain('"operationId":9007199254740993');
    expect(stringify(payload)).toContain('"rate":9999999999999999.999999');
    expect(stringify(payload)).toContain('"quantityBasis":0.000001');
    expect(payload.effectiveTo).toBeNull();
  });
  it("preserves master version and deactivate state without a fabricated delete endpoint", async () => {
    const result = await service.saveMaster("work-centres", 4, { code: "WC4", name: "Line 4", capacityBasis: "Minutes", defaultShiftId: null, isActive: false, version: "v1", notes: null });
    expect(productionApi.put).toHaveBeenCalledWith("/api/v1/manufacturing/work-centres/4", expect.objectContaining({ version: "v1", isActive: false, defaultShiftId: null }));
    expect(result.data.version).toBe("v2");
  });
  it("distinguishes dated calendar replacement from idempotent effectivity close", async () => {
    const calendar = { version: "shift-v1", businessDate: "2026-10-27", breaks: [], downtime: [{ from: "2026-10-27T22:00:00+05:30", to: "2026-10-27T23:00:00+05:30", reason: "Maintenance" }] };
    await service.calendar(33, calendar);
    expect(productionApi.put).toHaveBeenCalledWith("/api/v1/manufacturing/shift-capacity/33/calendar", calendar);
    await service.closeEffectivity("shift", 33, { version: "shift-v1", idempotencyKey: "same-attempt", effectiveTo: "2026-10-28", reason: "Revision" });
    expect(productionApi.post).toHaveBeenCalledWith("/api/v1/manufacturing/configuration/shift/33/effectivity", expect.objectContaining({ idempotencyKey: "same-attempt", version: "shift-v1" }));
  });
  it("reads authoritative saved calendar date and version before a replacement", async () => {
    const signal = new AbortController().signal;
    productionApi.get.mockResolvedValueOnce({ data: { succeeded: true, data: { id: 33, version: "calendar-v4", businessDate: "2026-10-27", breaks: [{ from: "2026-10-27T23:00:00+05:30", to: "2026-10-27T23:30:00+05:30", reason: "Meal" }], downtime: [] } } });
    const saved = await service.calendarContext(33, "2026-10-27", { signal });
    expect(productionApi.get).toHaveBeenCalledWith("/api/v1/manufacturing/shift-capacity/33/calendar", { params: { businessDate: "2026-10-27" }, signal });
    await service.calendar(33, { version: saved.data.version, businessDate: saved.data.businessDate, breaks: saved.data.breaks, downtime: saved.data.downtime });
    expect(productionApi.put.mock.calls[0][1].version).toBe("calendar-v4");
    expect(productionApi.put.mock.calls[0][1].breaks[0].reason).toBe("Meal");
  });
  it("carries verified packaging provenance and rejects unrepresentable input before HTTP", async () => {
    await service.savePackagingConversion(7, { version: "v1", idempotencyKey: "verify", sourceUnitId: "18", sourceQuantityBasis: "1", baseQuantityBasis: "120.000001", sourceReference: "Supplier dated specification" });
    expect(productionApi.put.mock.calls[0][0]).toBe("/api/v1/supply-chain/packaging-profiles/7/conversion");
    expect(stringify(productionApi.put.mock.calls[0][1])).toContain('"baseQuantityBasis":120.000001');
    await expect(service.createEligibility(12, { machineId: "1", mouldId: "2", skuOutputPerShot: "0.0000001" })).rejects.toThrow("decimal places");
    expect(productionApi.post).not.toHaveBeenCalled();
  });
  it("reads actual OEE, HR and Unit endpoints through the precise transport and preserves unsafe IDs", async () => {
    productionApi.get.mockResolvedValue({ data: { data: { items: [{ id: "9007199254740993" }], totalCount: 1 } } });
    const signal = new AbortController().signal;
    const machine = await service.machines({ PageNumber: 2, PageSize: 200 }, { signal });
    expect(machine.data.items[0].id).toBe("9007199254740993");
    expect(productionApi.get).toHaveBeenCalledWith("/api/v1/oee/machines", expect.objectContaining({ params: expect.objectContaining({ Page: 2, PageSize: 200 }), signal }));
    await service.moulds({}, { signal }); await service.hrShifts({}, { signal }); await service.units({}, { signal });
    expect(productionApi.get.mock.calls.map(([path]) => path)).toEqual(["/api/v1/oee/machines", "/api/v1/oee/moulds", "/api/hr/shifts", "/api/units"]);
  });
});
