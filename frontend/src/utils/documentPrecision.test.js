import { describe, expect, it } from "vitest";
import { serializeProductionJson } from "../services/manufacturing/productionApi";
import { documentIdText, documentQuantityText, wireDocumentQuantities } from "./documentPrecision";
import { purchaseDocumentSchema } from "../pages/purchase/documents/purchaseDocumentSchema";
import { invoiceSchema } from "../pages/sales/invoices/invoiceSchema";
import { buildPurchaseDocumentPayload, normalizeNumberBlurValue as purchaseBlur } from "../pages/purchase/purchaseHelpers";
import { buildInvoicePayload, getInvoiceDefaultValues, normalizeNumberBlurValue as invoiceBlur } from "../pages/sales/invoices/invoiceHelpers";

const id = "9223372036854775807", maximum = "9999999999999999.999999";
const line = { itemId: id, quantity: maximum, unitId: id, purchaseBillItemId: id, purchasePrice: "0", rate: "0", discountPercentage: "0", discountAmount: "0", taxPercentage: "0", taxRateId: id };
const bill = { supplierId: "11111111-1111-4111-8111-111111111111", billDate: "2026-10-27", dueDate: "", paymentType: 1, discountAmount: "0", roundOff: "0", paidAmount: "0", items: [line] };
const invoice = { customerPartyId: "11111111-1111-1111-1111-111111111111", companyId: id, companyGstRegistrationId: id, placeOfSupplyStateCode: "", placeOfSupplySource: "", invoiceDate: "2026-10-27", dueDate: "", discountAmount: "0", items: [line] };

describe("document editor quantity and identity boundary", () => {
  it("keeps the upper posting bound and tiny quantity intact through real form schemas, payload helpers and numeric JSON", () => {
    const parsedBill = purchaseDocumentSchema("billDate").parse(bill);
    const parsedInvoice = invoiceSchema.parse(invoice);
    for (const parsed of [parsedBill, parsedInvoice]) expect(parsed.items[0]).toMatchObject({ itemId: id, quantity: maximum });
    const bodies = [buildPurchaseDocumentPayload(parsedBill, { dateField: "billDate" }), buildInvoicePayload(parsedInvoice)];
    for (const body of bodies) {
      expect(body.items[0].quantity).toBe(maximum);
      const json = serializeProductionJson(wireDocumentQuantities(body));
      expect(json).toContain(`"itemId":${id}`);
      expect(json).toContain(`"quantity":${maximum}`);
    }
    expect(serializeProductionJson(wireDocumentQuantities(buildInvoicePayload(invoiceSchema.parse({ ...invoice, items: [{ ...line, quantity: "0.000001" }] }))))).toContain('"quantity":0.000001');
    expect(purchaseBlur(maximum)).toBe(maximum);
    expect(invoiceBlur(maximum)).toBe(maximum);
    expect(invoiceBlur("0.000001")).toBe("0.000001");
  });
  it("rejects rounded native IDs and unsupported quantity bounds instead of silently replacing them", () => {
    expect(() => documentIdText(Number(id))).toThrow("exact record");
    for (const quantity of ["0", "-1", "10000000000000000", "0.0000001", ""]) {
      expect(() => documentQuantityText(quantity)).toThrow();
      expect(invoiceSchema.safeParse({ ...invoice, items: [{ ...line, quantity }] }).success).toBe(false);
      expect(purchaseDocumentSchema("billDate").safeParse({ ...bill, items: [{ ...line, quantity }] }).success).toBe(false);
    }
    expect(() => buildInvoicePayload({ ...invoice, items: [{ ...line, quantity: "0" }] })).toThrow();
  });
  it("retains financial/date/payment validation while quantities stay text", () => {
    expect(invoiceSchema.safeParse({ ...invoice, items: [{ ...line, quantity: "2", rate: "5", discountAmount: "11" }] }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...invoice, items: [{ ...line, rate: "-1" }] }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...invoice, dueDate: "2026-10-26" }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...invoice, initialPayment: { amount: "1", paymentMode: 1, paymentDate: "" } }).success).toBe(false);
    expect(purchaseDocumentSchema("billDate").safeParse({ ...bill, items: [{ ...line, discountPercentage: "101" }] }).success).toBe(false);
    expect(purchaseDocumentSchema("billDate").safeParse({ ...bill, paymentType: 987 }).success).toBe(false);
    const body = buildInvoicePayload(invoiceSchema.parse({ ...invoice, items: [{ ...line, quantity: "1.000001", rate: "12.34", discountPercentage: "5", taxPercentage: "0.5" }] }));
    expect(body.items[0]).toMatchObject({ quantity: "1.000001", rate: 12.34, discountPercentage: 5, taxPercentage: 0.5 });
  });
  it("does not seed a new invoice from a hidden UTC/workstation date and keeps persisted business dates", () => {
    expect(getInvoiceDefaultValues(null)).toMatchObject({ invoiceDate: "", dueDate: "", initialPayment: { paymentDate: "" } });
    expect(getInvoiceDefaultValues({ invoiceDate: "2026-10-27", dueDate: "2026-11-10", items: [{ ...line, quantity: maximum }] })).toMatchObject({ invoiceDate: "2026-10-27", dueDate: "2026-11-10", items: [{ quantity: maximum }] });
  });
});
