import { describe, expect, it, vi } from "vitest";
import { addQuantity, buildCompletionPayload, buildDraftPayload, buildSchedulePayload, commandIdentity, commonRouteShiftIds, compareQuantity, completionMaterialPreview, formatOrderQuantity, isBusinessDate, isOffsetTimestamp, materialEstimate, normalizeOrderPage, orderStatusName, quantity, routeEligibleResources, verifyPlanningSource } from "./orderHelpers";

const order = { id: 1, version: "0x012", businessDate: "2026-10-27", machineId: "7", mouldId: "8", shiftId: "9", releasedQuantity: "10", remainingQuantity: "6.000001" };
const materials = [{ itemId: "4", unitId: "2", requiredQuantity: "20" }];
const actual = () => ({ businessDate: "2026-10-27", occurredAt: "2026-10-27T22:30:00+05:30", goodOutput: "3.000001", rejectedOutput: "1", materials: [{ consumedQuantity: "7", scrapQuantity: "0.5", returnedQuantity: "2" }], sourceReference: "JOB-1", varianceReason: "Supervisor approved" });
describe("production order quantities and lifecycle contracts", () => {
  it("keeps the distinct new six-state lifecycle separate from legacy statuses", () => {
    expect([1, 2, 3, 4, 5, 6].map(orderStatusName)).toEqual(["Draft", "Released", "InProgress", "Completed", "Closed", "Cancelled"]);
  });
  it("preserves six-place posting values at the DECIMAL(22,6) upper bound", () => {
    expect(quantity("9999999999999999.999999")).toBe("9999999999999999.999999");
    expect(addQuantity("9999999999999999", "0.000001")).toBe("9999999999999999.000001");
    expect(compareQuantity("0.100001", "0.1")).toBe(1);
    expect(() => quantity("0.0000001")).toThrow();
    expect(() => quantity("-1")).toThrow();
    expect(() => quantity("1e-6")).toThrow();
    expect(quantity("01.0000000000")).toBe("1");
  });
  it("retains unknown values and twelve-place source audit precision", () => {
    expect(formatOrderQuantity(null)).toBe("—");
    expect(formatOrderQuantity("0.333333333333")).toBe("0.333333333333");
    expect(materialEstimate({ sourceComponentQuantity: "1", outputBaseQuantity: "3", wastePercent: "0" }, "3")).toBe("1");
    expect(materialEstimate({ quantity: "0.333333333333", outputBaseQuantity: "1", wastagePercentage: "5" }, "3")).toBe("1.05");
    expect(materialEstimate({ quantity: "2", outputBaseQuantity: "0" }, "3")).toBeNull();
  });
  it("does not invent business-day defaults or accept malformed date-only/offset values", () => {
    expect(isBusinessDate("2026-02-30")).toBe(false);
    expect(isBusinessDate("2028-02-29")).toBe(true);
    expect(isOffsetTimestamp("2026-10-27T23:30:00+05:30")).toBe(true);
    expect(isOffsetTimestamp("2026-10-27T23:30")).toBe(false);
    expect(isOffsetTimestamp("2026-02-30T09:30:00+05:30")).toBe(false);
    expect(isOffsetTimestamp("2026-10-27T09:30:00+14:30")).toBe(false);
    expect(() => buildDraftPayload({})).toThrow("explicit business");
  });
  it("builds a real draft with exact source identity and current edit version", () => {
    const form = { businessDate: "2026-10-27", plannedStart: "2026-10-28", dueDate: "2026-10-29", itemId: "9223372036854775807", bomId: "2", routingId: "3", machineId: "4", mouldId: "5", shiftId: "6", plannedQuantity: "4.000001", sourcePlanId: "11111111-2222-3333-4444-555555555555", sourceLineId: "9223372036854775807" };
    expect(buildDraftPayload(form, "v1")).toMatchObject({ itemId: "9223372036854775807", plannedQuantity: "4.000001", sourcePlanId: form.sourcePlanId, sourceLineId: "9223372036854775807", version: "v1" });
    expect(() => buildDraftPayload({ ...form, dueDate: "2026-10-27" })).toThrow("Due date");
    expect(() => buildDraftPayload({ ...form, itemId: 9007199254740992 })).toThrow("Select an Item");
    expect(() => buildDraftPayload({ ...form, machineId: "9223372036854775808" })).toThrow("Select an Item");
    expect(() => buildDraftPayload({ ...form, sourcePlanId: "invented-source" })).toThrow("real saved planning snapshot");
  });
  it("uses the company date/closed period instead of the offset's displayed calendar date", () => {
    const runtime = { businessDate: "2026-10-28", browserTimeZone: "Asia/Kolkata", closedThroughDate: "2026-10-26" };
    const atMidnight = { ...actual(), occurredAt: "2026-10-27T20:00:00Z", businessDate: "2026-10-28" };
    expect(buildCompletionPayload(order, materials, atMidnight, runtime).businessDate).toBe("2026-10-28");
    expect(() => buildCompletionPayload(order, materials, { ...atMidnight, businessDate: "2026-10-27" }, runtime)).toThrow("company timezone");
    expect(() => buildCompletionPayload(order, materials, { ...actual(), businessDate: "2026-10-29" }, runtime)).toThrow("future");
    expect(() => buildCompletionPayload({ ...order, businessDate: "2026-10-01" }, materials, { ...actual(), businessDate: "2026-10-26" }, runtime)).toThrow("closed through");
  });
  it("keeps good/reject and consumed/scrap/staging return independent for repeated partials", () => {
    const payload = buildCompletionPayload(order, materials, actual());
    expect(payload).toMatchObject({ version: "0x012", goodOutput: "3.000001", rejectedOutput: "1", machineId: "7", mouldId: "8", shiftId: "9", materials: [{ itemId: "4", unitId: "2", consumedQuantity: "7", scrapQuantity: "0.5", returnedQuantity: "2" }] });
    expect(addQuantity(payload.materials[0].consumedQuantity, payload.materials[0].scrapQuantity)).toBe("7.5");
    expect(() => buildCompletionPayload(order, materials, { ...actual(), goodOutput: "6", rejectedOutput: "0.000002" })).toThrow("remaining");
    expect(() => buildCompletionPayload(order, materials, { ...actual(), goodOutput: "0", rejectedOutput: "0" })).toThrow("positive");
    expect(() => buildCompletionPayload({ ...order, machineId: null }, materials, actual())).toThrow("resource assignments");
  });
  it("preserves identical uncertain retries and creates a new key only when the intent changes", () => {
    const key = vi.fn().mockReturnValueOnce("key1").mockReturnValueOnce("key2");
    const first = commandIdentity(null, { version: "v1", quantity: "2" }, key);
    expect(commandIdentity(first, { version: "v1", quantity: "2" }, key)).toBe(first);
    expect(commandIdentity(first, { version: "v2", quantity: "2" }, key).key).toBe("key2");
    expect(key).toHaveBeenCalledTimes(2);
  });
  it("preserves zero-page server metadata and summary, without synthesizing totals", () => {
    expect(normalizeOrderPage({ data: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0, summary: [] } })).toEqual({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0, summary: [] });
    const page = normalizeOrderPage({ data: { items: [], pageNumber: 3, pageSize: 20, totalCount: 42, summary: [{ UnitId: "9007199254740993", PlannedQuantity: "1234567890123456.000001", ReleasedQuantity: "0", CompletedQuantity: null, RejectedQuantity: "0.000001", RemainingQuantity: "2" }] } });
    expect(page.summary[0]).toEqual({ unitId: "9007199254740993", plannedQuantity: "1234567890123456.000001", releasedQuantity: "0", completedQuantity: null, rejectedQuantity: "0.000001", remainingQuantity: "2" });
    expect(page.totalCount).toBe(42);
    expect(page.totalPages).toBe(3);
  });
});
describe("authoritative planning source", () => {
  const form = { itemId: "4", sourceLineId: "4", plannedQuantity: "2" };
  const snapshot = { asOfDate: "2026-10-27", lines: { items: [{ itemId: 4, freshness: 1, suggestedProduction: "3.000001", sourceRevision: "determinants1" }] } };
  it("verifies the real item-filtered paged line and preserves its revision", () => {
    expect(verifyPlanningSource(snapshot, form, "2026-10-27").sourceRevision).toBe("determinants1");
  });
  it("blocks stale dates, wrong line identity, unavailable demand and excess quantity", () => {
    expect(() => verifyPlanningSource(snapshot, form, "2026-10-28")).toThrow("different business date");
    expect(() => verifyPlanningSource(snapshot, { ...form, sourceLineId: "other" }, "2026-10-27")).toThrow("source line");
    expect(() => verifyPlanningSource(snapshot, { ...form, plannedQuantity: "3.000002" }, "2026-10-27")).toThrow("exceeds");
    expect(() => verifyPlanningSource({ ...snapshot, lines: { items: [{ itemId: 4, freshness: 2 }] } }, form, "2026-10-27")).toThrow("stale");
    expect(() => verifyPlanningSource({ ...snapshot, channelId: 9 }, form, "2026-10-27")).toThrow("channel must match");
    expect(verifyPlanningSource({ ...snapshot, channelId: 9 }, { ...form, channelId: "9" }, "2026-10-27").sourceRevision).toBe("determinants1");
  });
});
describe("explicit ordered capacity booking", () => {
  const capacity = { version: "v2", timeZone: "Asia/Kolkata", lines: [{ routingStepId: 11, sequence: 1, requiredMinutes: "30", availableMinutes: "120", capacityFactor: "1", minimumBookingSeconds: "1800", windowFrom: "2026-10-27T22:00:00+05:30", windowTo: "2026-10-28T02:00:00+05:30" }, { routingStepId: 12, sequence: 2, requiredMinutes: "30", availableMinutes: "120", capacityFactor: "1", minimumBookingSeconds: "1800", windowFrom: "2026-10-27T22:00:00+05:30", windowTo: "2026-10-28T02:00:00+05:30" }] };
  const bookings = { 11: { from: "2026-10-27T23:00:00+05:30", to: "2026-10-28T00:00:00+05:30" }, 12: { from: "2026-10-28T00:00:00+05:30", to: "2026-10-28T00:30:00+05:30" } };
  it("keeps explicit offsets and overnight windows in route sequence", () => {
    expect(buildSchedulePayload(capacity, "2026-10-27", bookings)).toEqual({ version: "v2", businessDate: "2026-10-27", bookings: [{ routingStepId: 11, ...bookings[11] }, { routingStepId: 12, ...bookings[12] }] });
  });
  it("blocks unknown capacity, missing operations, overlap, short duration and outside-window requests", () => {
    expect(() => buildSchedulePayload({ ...capacity, conflictCode: "UNKNOWN_RATE" }, "2026-10-27", bookings)).toThrow("Resolve");
    expect(() => buildSchedulePayload(capacity, "2026-10-27", { 11: bookings[11] })).toThrow("Every route");
    expect(() => buildSchedulePayload(capacity, "2026-10-27", { ...bookings, 12: bookings[11] })).toThrow("overlap");
    expect(() => buildSchedulePayload(capacity, "2026-10-27", { ...bookings, 12: { ...bookings[12], to: "2026-10-28T00:01:00+05:30" } })).toThrow("shorter");
    expect(() => buildSchedulePayload(capacity, "2026-10-27", { ...bookings, 12: { ...bookings[12], to: "2026-10-28T03:00:00+05:30" } })).toThrow("within");
  });
  it("honors the exact server minimum for reduced capacity factor and does not guess a missing duration", () => {
    const reduced = { ...capacity, lines: [{ ...capacity.lines[0], capacityFactor: "0.5", minimumBookingSeconds: "3601", requiredMinutes: "30.000001" }] };
    expect(() => buildSchedulePayload(reduced, "2026-10-27", { 11: bookings[11] })).toThrow("server's minimum duration");
    expect(buildSchedulePayload(reduced, "2026-10-27", { 11: { ...bookings[11], to: "2026-10-28T00:00:01+05:30" } }).bookings[0].to).toBe("2026-10-28T00:00:01+05:30");
    expect(() => buildSchedulePayload({ ...reduced, lines: [{ ...reduced.lines[0], minimumBookingSeconds: null }] }, "2026-10-27", bookings)).toThrow("unavailable capacity");
    const oneSecond = { ...capacity, lines: [{ ...capacity.lines[0], minimumBookingSeconds: "1", requiredMinutes: "0.01", capacityFactor: "0.6" }] };
    const boundary = { from: "2026-10-27T23:00:00.9999999+05:30", to: "2026-10-27T23:00:01.0000000+05:30" };
    expect(buildSchedulePayload(oneSecond, "2026-10-27", { 11: boundary }).bookings[0]).toEqual({ routingStepId: 11, ...boundary });
    expect(() => buildSchedulePayload(oneSecond, "2026-10-27", { 11: { ...boundary, from: "2026-10-27T23:00:00.0000000+05:30", to: "2026-10-27T23:00:00.9999999+05:30" } })).toThrow("server's minimum duration");
  });
});

describe("partial material allocation preview", () => {
  it("preserves the cumulative rounding residue and separates staging returns from actual deduction", () => {
    const order = { releasedQuantity: "3", completedQuantity: "1", rejectedQuantity: "0" };
    const material = { itemId: 9, requiredQuantity: "1", baselineOutputQuantity: "0", baselineExpectedQuantity: "0" };
    const history = [{ id: 1, goodOutput: "1", rejectedOutput: "0", materials: [{ itemId: 9, expectedQuantity: "0.333333" }] }];
    const form = { goodOutput: "1", rejectedOutput: "0", materials: [{ consumedQuantity: "0.3", scrapQuantity: "0.033334", returnedQuantity: "99" }] };
    expect(completionMaterialPreview(order, [material], history, form)[0]).toEqual({ itemId: 9, expectedQuantity: "0.333334", actualDeduction: "0.333334", overConsumption: false });
    const finalHistory = [...history, { id: 2, goodOutput: "1", rejectedOutput: "0", materials: [{ itemId: 9, expectedQuantity: "0.333334" }] }];
    expect(completionMaterialPreview({ ...order, completedQuantity: "2" }, [material], finalHistory, form)[0]).toMatchObject({ expectedQuantity: "0.333333", overConsumption: true });
  });
  it("uses an amended frozen baseline and keeps unavailable baseline/history unknown", () => {
    const order = { releasedQuantity: "5", completedQuantity: "2", rejectedQuantity: "0" };
    const material = { itemId: 9, requiredQuantity: "1.666666", baselineOutputQuantity: "1", baselineExpectedQuantity: "0.333333" };
    const history = [{ goodOutput: "1", rejectedOutput: "0", materials: [{ itemId: 9, expectedQuantity: "0.333333" }] }, { goodOutput: "1", rejectedOutput: "0", materials: [{ itemId: 9, expectedQuantity: "0.333333" }] }];
    const form = { goodOutput: "3", rejectedOutput: "0", materials: [{ consumedQuantity: "1", scrapQuantity: "0", returnedQuantity: "0" }] };
    expect(completionMaterialPreview(order, [material], history, form)[0]).toMatchObject({ expectedQuantity: "1", actualDeduction: "1", overConsumption: false });
    expect(completionMaterialPreview(order, [{ ...material, baselineOutputQuantity: null }], history, form)[0].expectedQuantity).toBeNull();
    expect(completionMaterialPreview(order, [material], [], form)[0].expectedQuantity).toBeNull();
    expect(completionMaterialPreview(order, [material], [{ ...history[0], materials: [] }, history[1]], form)[0].expectedQuantity).toBeNull();
  });
});

describe("effective route resource selection", () => {
  it("requires an effective Item pair satisfying every route restriction and a common dated HR shift", () => {
    const route = { steps: [{ workCentreId: 9, machineId: 11 }, { workCentreId: 10, mouldId: 21 }] };
    const pairs = [{ machineId: 11, mouldId: 21, effectiveFrom: "2026-11-01" }, { machineId: 12, mouldId: 21, effectiveFrom: "2026-10-01" }, { machineId: 11, mouldId: 22, effectiveFrom: "2026-10-01" }];
    expect(routeEligibleResources(pairs, route, "2026-10-27")).toEqual([]);
    expect(routeEligibleResources(pairs, route, "2026-11-01")).toEqual([pairs[0]]);
    const centres = [{ shifts: [{ shiftId: 3, effectiveFrom: "2026-11-01" }, { shiftId: 4, effectiveFrom: "2026-10-01" }] }, { shifts: [{ shiftId: 3, effectiveFrom: "2026-11-01" }, { shiftId: 4, effectiveFrom: "2026-10-01", effectiveTo: "2026-10-31" }] }];
    expect([...commonRouteShiftIds(centres, "2026-11-01")]).toEqual(["3"]);
    expect([...commonRouteShiftIds([...centres, { shifts: [] }], "2026-11-01")]).toEqual([]);
  });
});
