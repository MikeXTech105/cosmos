import { describe, expect, it } from "vitest";
import { buildBillReceiptLinks, buildProcurementDraft, buildReceiptCredit, buildReceiptLines, buildShipmentLinks, quantityCompare, quantityDifference, quantitySum, receiptCreditSources } from "./physicalHelpers";

describe("procurement and physical purchase posting", () => {
  const line = { id: 71, itemId: 8, unitId: 3, itemName: "Resin", quantity: "10.000001", finalQuantity: "2.000001" };
  it("preserves selected finalized source identities and exact sourced price/tax; unknown cost is refused", () => {
    const form = { supplierId: "11111111-1111-1111-1111-111111111111", orderDate: "2026-10-27", expectedDate: "2026-10-28", notes: "Quote reviewed" };
    const input = { 71: { selected: true, price: "12345678901234.25", tax: "0.0001", source: "Supplier quote Q-42" } };
    const payload = buildProcurementDraft([line, { ...line, id: 72 }], input, form);
    expect(payload.lines).toEqual([{ planningRunLineId: 71, unitPrice: "12345678901234.25", taxPercentage: "0.0001", priceSourceReference: "Supplier quote Q-42" }]);
    expect(() => buildProcurementDraft([line], { 71: { ...input[71], price: "" } }, form)).toThrow(/number/);
    expect(() => buildProcurementDraft([{ ...line, finalQuantity: "0" }], input, form)).toThrow(/positive/);
    expect(() => buildProcurementDraft([line], input, { ...form, expectedDate: "2026-10-26" })).toThrow(/precede/);
  });
  it("keeps six-place dispositions separate and unknown receipt cost null", () => {
    const rows = buildReceiptLines([line], { 71: { selected: true, accepted: "0.000001", rejected: "2", quarantined: "3", cost: "" } }, [{ purchaseOrderLineId: 71, acceptedQuantity: "10" }]);
    expect(rows).toEqual([{ purchaseOrderLineId: 71, itemId: 8, unitId: 3, acceptedQuantity: "0.000001", rejectedQuantity: "2", quarantinedQuantity: "3", sourceUnitCost: null }]);
  });
  it("enforces zero over-accepted tolerance and does not treat returned stock as reopened PO supply", () => {
    const received = [{ purchaseOrderLineId: 71, acceptedQuantity: "10.000001", returnedAcceptedQuantity: "4" }];
    expect(() => buildReceiptLines([line], { 71: { selected: true, accepted: "0.000001", rejected: "0", quarantined: "0", cost: "1.00" } }, received)).toThrow(/tolerance is zero/);
    expect(() => buildReceiptLines([{ ...line, unitId: null }], { 71: { selected: true } })).toThrow(/base unit/);
    expect(() => buildReceiptLines([line], { 71: { selected: true, accepted: "0.0000001", rejected: "0", quarantined: "0" } })).toThrow(/6 decimal/);
  });
  it("does not collapse large values or a one-millionth accepted remainder through floating point", () => {
    expect(quantityCompare("9007199254740993.000001", "9007199254740993")).toBe(1);
    expect(quantityDifference("9007199254740993.000001", "9007199254740993")).toBe("0.000001");
    expect(quantitySum(["0.000001", "0.000002", "9007199254740993"])).toBe("9007199254740993.000003");
  });
  it("links actual partial shipment quantities only to shipment-owned invoice lines", () => {
    const shipment = [{ id: 11, itemId: 8, unitId: 3, plannedQuantity: "0.000003" }];
    const invoices = [{ invoiceLineId: 21, itemId: 8, unitId: 3, quantity: "0.000002", owner: 2 }, { invoiceLineId: 22, itemId: 8, unitId: 3, quantity: "0.000001", owner: 2 }];
    const rows = [{ shipmentItemId: 11, invoiceLineId: 21, quantity: "0.000002" }, { shipmentItemId: 11, invoiceLineId: 22, quantity: "0.000001" }];
    expect(buildShipmentLinks(shipment, invoices, [], rows)).toEqual(rows);
    expect(() => buildShipmentLinks(shipment, [{ ...invoices[0], owner: 1 }], [], [rows[0]])).toThrow(/declare Shipment ownership/);
    expect(() => buildShipmentLinks(shipment, [{ ...invoices[0], unitId: 4 }], [], [rows[0]])).toThrow(/base units/);
    expect(() => buildShipmentLinks(shipment, [{ ...invoices[0], itemId: 9 }], [], [rows[0]])).toThrow(/identities/);
    expect(() => buildShipmentLinks([{ ...shipment[0], unitId: null }], invoices, [], [rows[0]])).toThrow(/real base unit/);
    expect(() => buildShipmentLinks(shipment, [{ ...invoices[0], unitId: null }], [], [rows[0]])).toThrow(/real base unit/);
  });
  it("revalidates partial cumulative shipment/invoice balances and prevents retrying already-saved pairs as a new command", () => {
    const shipment = [{ id: 11, itemId: 8, unitId: 3, plannedQuantity: "1.000001" }];
    const invoices = [{ invoiceLineId: 21, itemId: 8, unitId: 3, quantity: "1", owner: 2 }, { invoiceLineId: 22, itemId: 8, unitId: 3, quantity: "1", owner: 2 }];
    const old = [{ shipmentItemId: 11, invoiceLineId: 21, quantity: "1" }];
    expect(buildShipmentLinks(shipment, invoices, old, [{ shipmentItemId: 11, invoiceLineId: 22, quantity: "0.000001" }])[0].quantity).toBe("0.000001");
    expect(() => buildShipmentLinks(shipment, invoices, old, [{ shipmentItemId: 11, invoiceLineId: 22, quantity: "0.000002" }])).toThrow(/shipment line quantity/);
    expect(() => buildShipmentLinks(shipment, invoices, [], [{ shipmentItemId: 11, invoiceLineId: 21, quantity: "1.000001" }])).toThrow(/invoice line quantity/);
    expect(() => buildShipmentLinks(shipment, invoices, old, [{ shipmentItemId: 11, invoiceLineId: 21, quantity: "0.000001" }])).toThrow(/already linked/);
  });
  it("fully reconciles a later bill line across real partial receipts without posting dispositions or cost again", () => {
    const bill = [{ id: 41, itemId: 8, unitId: 3, quantity: "10.000001" }];
    const receipts = [{ id: 51, itemId: 8, unitId: 3, acceptedQuantity: "6", billedQuantity: "0" }, { id: 52, itemId: 8, unitId: 3, acceptedQuantity: "4.000001", billedQuantity: "0" }];
    const allocations = [{ receiptLineId: 51, billItemId: 41, quantity: "6" }, { receiptLineId: 52, billItemId: 41, quantity: "4.000001" }];
    expect(buildBillReceiptLinks(bill, receipts, [], allocations)).toEqual(allocations);
    expect(() => buildBillReceiptLinks(bill, receipts, [], [allocations[0]])).toThrow(/Fully reconcile/);
    expect(() => buildBillReceiptLinks(bill, [{ ...receipts[0], billedQuantity: "1" }, receipts[1]], [], allocations)).toThrow(/still available for billing/);
    expect(() => buildBillReceiptLinks(bill, [{ ...receipts[0], unitId: 4 }, receipts[1]], [], allocations)).toThrow(/Item\/base unit/);
    expect(() => buildBillReceiptLinks(bill, receipts, allocations, allocations)).toThrow(/already linked/);
  });
  it("credits one original confirmed billed source and blocks spanning returns without rewriting physical history", () => {
    const context = {
      returns: [{ id: 81, receiptLineId: 51, acceptedQuantity: "6", rejectedQuantity: "0", quarantinedQuantity: "0", purchaseReturnId: null }, { id: 82, receiptLineId: 51, acceptedQuantity: "1", purchaseReturnId: 91, billItemId: 41 }],
      billLinks: [{ billItemId: 41, receiptLineId: 51, quantity: "7", billStatus: 2 }, { billItemId: 42, receiptLineId: 51, quantity: "4", billStatus: 3 }, { billItemId: 43, receiptLineId: 51, quantity: "99", billStatus: 1 }, { billItemId: 44, receiptLineId: 51, quantity: "99", billStatus: null }],
    };
    const snapshot = structuredClone(context);
    expect(receiptCreditSources(context, 81).map((source) => source.billItemId)).toEqual([41, 42]);
    expect(buildReceiptCredit(context, { returnId: 81, billItemId: 41, businessDate: "2026-10-27", reason: "Original billed return" })).toEqual({ billItemId: 41, businessDate: "2026-10-27", reason: "Original billed return" });
    expect(() => buildReceiptCredit(context, { returnId: 81, billItemId: 42, businessDate: "2026-10-27", reason: "Spans bills" })).toThrow(/complete return against one bill line/);
    expect(() => buildReceiptCredit(context, { returnId: 81, billItemId: 43, businessDate: "2026-10-27", reason: "Draft is not confirmed" })).toThrow(/confirmed bill line/);
    expect(() => buildReceiptCredit(context, { returnId: 82, billItemId: 41, businessDate: "2026-10-27", reason: "Already credited" })).toThrow(/uncredited/);
    expect(context).toEqual(snapshot);
    expect(() => buildReceiptCredit({ ...context, returns: [{ ...context.returns[0], businessDate: "2026-10-28" }] }, { returnId: 81, billItemId: 41, businessDate: "2026-10-27", reason: "Too early" })).toThrow(/cannot precede/);
  });
});
