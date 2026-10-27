import { beforeEach, describe, expect, it, vi } from "vitest";
const axios = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("../api/axios", () => ({ default: axios }));
import { serializeProductionJson } from "./manufacturing/productionApi";
import { purchaseBillService } from "./purchase/purchaseBillService";
import { purchaseOrderService } from "./purchase/purchaseOrderService";
import { purchaseReturnService } from "./purchase/purchaseReturnService";
import { invoiceService } from "./sales/invoiceService";
import { documentLookupService } from "./documentLookupService";

describe("document quantity precision transport", () => {
  beforeEach(() => Object.values(axios).forEach(mock => mock.mockReset().mockResolvedValue({ data: { data: { id: 1 } } })));
  it("writes exact quantity/long-ID numeric tokens on existing bill/order/return/invoice create and update paths", async () => {
    const body = { items: [{ itemId: "9223372036854775807", unitId: "9223372036854775806", quantity: "9999999999999999.999999", purchasePrice: 12.34, rate: 12.34, taxPercentage: 0.5 }] };
    await purchaseBillService.createPurchaseBill(body); await purchaseBillService.updatePurchaseBill(1, body);
    await purchaseOrderService.createPurchaseOrder(body); await purchaseReturnService.createPurchaseReturn(body);
    await invoiceService.createInvoice(body); await invoiceService.updateInvoice(1, body);
    for (const [, sent] of [...axios.post.mock.calls, ...axios.put.mock.calls]) {
      const json = serializeProductionJson(sent);
      expect(json).toContain('"quantity":9999999999999999.999999');
      expect(json).toContain('"itemId":9223372036854775807');
      expect(json).toContain('"unitId":9223372036854775806');
      expect(json).toContain('"purchasePrice":12.34');
      expect(json).toContain('"taxPercentage":0.5');
    }
  });
  it("decodes the existing detail and Item lookup routes without truncating IDs or fractional quantities", async () => {
    axios.get.mockImplementation(async (_url, config) => ({ data: config.transformResponse[0]('{"data":{"id":9223372036854775807,"items":[{"quantity":9999999999999999.999999}],"unitId":9223372036854775806}}') }));
    for (const read of [purchaseBillService.getPurchaseBillById, purchaseOrderService.getPurchaseOrderById, purchaseReturnService.getPurchaseReturnById, invoiceService.getInvoiceById, documentLookupService.item]) {
      const response = await read("9223372036854775807");
      expect(response.data).toMatchObject({ id: "9223372036854775807", items: [{ quantity: "9999999999999999.999999" }], unitId: "9223372036854775806" });
    }
  });
});
