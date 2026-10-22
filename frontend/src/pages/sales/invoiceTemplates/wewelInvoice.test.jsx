import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTemplateInvoice } from "../invoices/invoiceHelpers";
import { invoiceTemplates } from "./templateRegistry";

describe("WEWEL billing documents", () => {
  const invoice = buildTemplateInvoice({
    id: 1, invoiceNumber: "INV-1", grandTotal: 100,
    items: [{ itemId: 1, itemName: "Product", quantity: 2, rate: 100,
      discountPercentage: 10, discountAmount: 5, taxAmount: 0, lineTotal: 175 }],
  });
  it("uses WEWEL without ERP branding or placeholder company details in every template", () => {
    for (const { Component } of invoiceTemplates) {
      const markup = renderToStaticMarkup(<Component invoice={invoice} />);
      expect(markup).toContain("WEWEL PLAST PRIVATE LIMITED");
      expect(markup).not.toMatch(/COSMOS|Your Company Name|accounts@example.com|98765 43210/);
    }
  });
  it("keeps both line discounts in the printed taxable value", () => {
    expect(invoice.items[0].taxableAmount).toBe(175);
  });
});
