import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import GstDocumentLinks from "./GstDocumentLinks";
import GstDocumentPage from "./GstDocumentPage";
import GstRegistrationsPage from "./GstRegistrationsPage";
import GstLogsPage from "./GstLogsPage";
import GstOverviewPage from "./GstOverviewPage";

const render = (component, pages = [], initial = "/") => {
  const store = configureStore({ reducer: () => ({ auth: { pages, roles: [], user: {} } }) });
  return renderToStaticMarkup(createElement(Provider, { store }, createElement(MemoryRouter, { initialEntries: [initial] }, component)));
};
const invoiceGrant = { pageName: "GST.EInvoice", route: "/gst/e-invoices", canView: true, canCreate: true };
const wayGrant = { pageName: "GST.EWayBill", route: "/gst/eway-bills", canView: true, canCreate: true };

describe("GST screens and document entry points", () => {
  it("hides document compliance without a GST view grant", () => {
    expect(render(createElement(GstDocumentLinks, { id: 8 }), [{ pageName: "Sales.Invoice", route: "/sales/invoices", canView: true }])).toBe("");
  });
  it("offers independent lookups and disabled generation with an explanatory reason", () => {
    const html = render(createElement(GstDocumentLinks, { id: 8 }), [invoiceGrant, wayGrant]);
    expect(html).toContain('/gst/e-invoices?salesInvoiceId=8');
    expect(html).toContain('/gst/eway-bills?salesInvoiceId=8');
    expect(html).toContain("Generate E-Invoice");
    expect(html).toContain("disabled");
    expect(html).toContain("duplicate protection");
    expect(html).toContain("Linked status unavailable");
  });
  it("does not offer Purchase E-Invoice support", () => {
    const html = render(createElement(GstDocumentLinks, { id: 7, purchase: true }), [invoiceGrant, wayGrant]);
    expect(html).toContain('/gst/eway-bills?purchaseInvoiceId=7');
    expect(html).not.toContain('/gst/e-invoices');
    expect(html).not.toContain('Generate E-Invoice');
  });
  it("does not build a GST document link for an invalid accounting-document ID", () => {
    const html = render(createElement(GstDocumentLinks, { id: 0, purchase: true }), [wayGrant]);
    expect(html).toContain("no valid accounting-document ID");
    expect(html).not.toContain("purchaseInvoiceId=0");
    expect(html).toContain("disabled");
  });
  it("does not expose a create action to view-only users", () => {
    const html = render(createElement(GstDocumentLinks, { id: 7 }), [{ ...invoiceGrant, canCreate: false }]);
    expect(html).toContain("View E-Invoice by identifier");
    expect(html).not.toContain("Generate E-Invoice");
  });
  it("renders identifier inputs and context without fabricating linked records", () => {
    const html = render(createElement(GstDocumentPage, { kind: "invoice" }), [invoiceGrant], "/gst/e-invoices?salesInvoiceId=8");
    expect(html).toContain("Invoice reference number (IRN)");
    expect(html).toContain("Sales Invoice");
    expect(html).toContain("Enter an existing identifier");
    expect(html).not.toContain("Acknowledgement number");
    expect(html).not.toContain("Confirm cancellation");
  });
  it("renders list loading skeletons and hides registration create without permission", () => {
    const html = render(createElement(GstRegistrationsPage), [{ pageName: "GST.Registration", route: "/gst/registrations", canView: true }]);
    expect(html).toContain("animate-pulse");
    expect(html).toContain("Search GSTIN / name");
    expect(html).not.toContain("Add registration");
    expect(html).not.toContain("No GST registrations found");
  });
  it("provides supported log filters and never renders raw request/response controls", () => {
    const html = render(createElement(GstLogsPage));
    for (const label of ["Operation", "Outcome", "From date / time", "Correlation ID", "Registration ID", "Sort by"]) expect(html).toContain(label);
    expect(html).not.toContain("RequestPayload");
    expect(html).not.toContain("ResponsePayload");
  });
  it("surfaces the implemented HSN and GST management pages instead of declaring them unavailable", () => {
    const pages = [
      { pageName: "GST.HsnSac", route: "/gst/hsn-sac", canView: true },
      { pageName: "GST.RateHistory", route: "/gst/rate-history", canView: true },
      { pageName: "GST.CategoryMapping", route: "/gst/category-mappings", canView: true },
      { pageName: "GST.ProductMapping", route: "/gst/product-mappings", canView: true },
    ];
    const html = render(createElement(GstOverviewPage), pages);
    expect(html).toContain('href="/gst/hsn-sac"');
    expect(html).toContain('href="/gst/rate-history"');
    expect(html).toContain('href="/gst/category-mappings"');
    expect(html).toContain('href="/gst/product-mappings"');
    expect(html).not.toContain("Central HSN/SAC management is unavailable");
  });
});
