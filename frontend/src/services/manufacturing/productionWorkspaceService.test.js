import { beforeEach, describe, expect, it, vi } from "vitest";
import { stringify } from "lossless-json";
import api from "./productionApi";
import { productionWorkspaceService as service } from "./productionWorkspaceService";
vi.mock("./productionApi", () => ({ default: { post: vi.fn(), get: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); api.post.mockResolvedValue({ data: { succeeded: true, data: { batchId: "saved-batch" }, errors: [] } }); });
describe("workspace import and stock wire contracts", () => {
  it("keeps twelve-place source evidence and six-place imported cost while preserving real identities and rowversion", async () => {
    await service.map("batch", { version: "opaque", idempotencyKey: "same-intent", rowId: "9223372036854775807", disposition: 4, itemId: "19", sourceUnitId: "7", sourceQuantity: "1234567890123456.123456789012", sourceUnitCost: "1.123456", sourceReference: "original-source", reason: "Verified source" });
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe("/api/v1/manufacturing/imports/batch/map");
    const raw = stringify(payload);
    expect(raw).toContain('"sourceQuantity":1234567890123456.123456789012');
    expect(raw).toContain('"sourceUnitCost":1.123456'); expect(raw).toContain('"rowId":9223372036854775807');
    expect(payload.version).toBe("opaque"); expect(payload.idempotencyKey).toBe("same-intent");
  });
  it("sends only the signed adjustment quantity with canonical unit, version, source and business date", async () => {
    await service.adjust("19", { unitId: "7", signedQuantity: "-0.000001", version: "opaque", idempotencyKey: "same-intent", businessDate: "2026-10-27", sourceReference: "adjustment-proof", reason: "Confirmed variance" });
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe("/api/items/19/stock-adjustments");
    expect(stringify(payload)).toContain('"signedQuantity":-0.000001');
    expect(payload).not.toHaveProperty("currentStock"); expect(payload).not.toHaveProperty("reservedStock");
  });
});
