import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeProductionJson } from "./productionApi";
import { physicalInventoryService as service, wirePhysicalPayload } from "./physicalInventoryService";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import axios from "../../api/axios";

describe("physical purchase and inventory contract transport", () => {
  beforeEach(() => vi.clearAllMocks());
  it("writes exact numeric tokens for large identities and six-place quantities", () => {
    const body = wirePhysicalPayload({ version: "0x0000000000000001", supplierId: "11111111-1111-1111-1111-111111111111", lines: [{ receiptLineId: "9007199254740993", billItemId: 21, quantity: "1234567890123456.000001", sourceUnitCost: null }] });
    const json = serializeProductionJson(body);
    expect(json).toContain('"receiptLineId":9007199254740993');
    expect(json).toContain('"quantity":1234567890123456.000001');
    expect(json).toContain('"sourceUnitCost":null');
    expect(json).toContain('"supplierId":"11111111-1111-1111-1111-111111111111"');
  });
  it("targets the real separate receipt, bill, credit and packing endpoints", async () => {
    axios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 6, version: "0x0000000000000001", status: "Posted" } } });
    axios.get.mockResolvedValue({ data: { succeeded: true, data: { id: 9, version: "0x0000000000000002", lines: [] } } });
    const response = await service.returnReceipt(9, { version: "0x0000000000000001", idempotencyKey: "same-command", receiptLineId: 8, businessDate: "2026-10-27", acceptedQuantity: "0.000001", rejectedQuantity: "0", quarantinedQuantity: "0", reason: "Damaged original material" });
    expect(axios.post.mock.calls[0][0]).toBe("/api/purchase-orders/receipts/9/returns");
    expect(response.data.id).toBe(6);
    await service.linkBill(7, { version: "0x0000000000000001", idempotencyKey: "bill-link", lines: [{ receiptLineId: 8, billItemId: 3, quantity: "0.000001" }] });
    expect(axios.post.mock.calls[1][0]).toBe("/api/purchase-bills/7/receipt-links");
    await service.creditReturn(6, { idempotencyKey: "credit", billItemId: 3, businessDate: "2026-10-27", reason: "Approved billed return" });
    expect(axios.post.mock.calls[2][0]).toBe("/api/purchase-orders/receipts/returns/6/credit");
    await service.packingContext(9);
    expect(axios.get.mock.calls[0][0]).toBe("/api/v1/shipment-operations/shipments/9/packing-verification");
    await service.purchaseSources(10);
    expect(axios.get.mock.calls[1][0]).toBe("/api/v1/procurement-planning/plans/runs/10/purchase-orders");
  });
});
