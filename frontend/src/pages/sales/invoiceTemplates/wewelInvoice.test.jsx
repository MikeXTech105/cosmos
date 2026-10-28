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
  it("honors the shipping-print flag in every template without inventing a billing-address fallback", () => {
    const source={ id: 3, items: [] };
    const customer={ partyName: "Buyer", billingAddressLine1: "Billing road", shippingAddressLine1: "Delivery warehouse" };
    for (const { Component } of invoiceTemplates) {
      expect(renderToStaticMarkup(<Component invoice={buildTemplateInvoice(source,customer,{printShippingAddress:false})}/>)).not.toContain("Delivery warehouse");
      const visible=renderToStaticMarkup(<Component invoice={buildTemplateInvoice(source,customer,{printShippingAddress:true})}/>);
      expect(visible).toContain("Delivery warehouse");
      expect(visible).toContain("Ship To");
      const absent=renderToStaticMarkup(<Component invoice={buildTemplateInvoice(source,{...customer,shippingAddressLine1:null},{printShippingAddress:true})}/>);
      expect(absent).not.toContain("Ship To");
    }
  });
  it("keeps exact six-place quantities in every existing invoice template instead of rounding the printed source", () => {
    const precise = buildTemplateInvoice({ id: 2, grandTotal: 0, items: [
      { id: 1, itemId: 1, itemName: "Large", quantity: "9999999999999999.999999", rate: 0 },
      { id: 2, itemId: 2, itemName: "Tiny", quantity: "0.000001", rate: 0 },
    ] });
    expect(precise.items.map(item => item.quantity)).toEqual(["9999999999999999.999999", "0.000001"]);
    for (const { Component } of invoiceTemplates) {
      const markup = renderToStaticMarkup(<Component invoice={precise} />);
      expect(markup).toContain("9,999,999,999,999,999.999999");
      expect(markup).toContain("0.000001");
    }
  });
});
