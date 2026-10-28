// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../../../store/store";
import InvoiceFormPage from "./InvoiceFormPage";
import { organizationService } from "../../../services/organization/organizationService";

vi.mock("../../../hooks/useDocumentBusinessDefaults", () => ({ default: () => ({ runtime: true, loading: false }) }));
vi.mock("../../../hooks/useCapabilities", () => ({ default: () => ({ canView: true, canCreate: true, canUpdate: true }) }));
vi.mock("../../../hooks/useCreatePermission", () => ({ default: () => true }));
vi.mock("../../../services/organization/organizationService", () => ({ organizationService: { companies: vi.fn(), branches: vi.fn() } }));
vi.mock("../../../services/documentLookupService", () => ({ documentLookupService: { items: vi.fn(), item: vi.fn(), registrations: vi.fn() } }));
vi.mock("../../party/partyService", () => ({ partyService: { getParties: vi.fn(), createParty: vi.fn() } }));

const response = (data) => ({ data });
const documentLookupService = await import("../../../services/documentLookupService").then((module) => module.documentLookupService);
const partyService = await import("../../party/partyService").then((module) => module.partyService);
const mount = (path = "/sales/invoices/new") => render(<Provider store={store}><MemoryRouter initialEntries={[path]}><Routes><Route path="/sales/invoices/new" element={<InvoiceFormPage />} /><Route path="/sales/invoices/:id/edit" element={<InvoiceFormPage />} /></Routes></MemoryRouter></Provider>);
const selectorFor = (label) => document.getElementById(screen.getByText(label, { selector: "label" }).htmlFor);

const seed = () => {
  organizationService.companies.mockResolvedValue(response([{ id: 1, code: "C1", name: "Company One", isActive: true }, { id: 2, code: "C2", name: "Company Two", isActive: true }]));
  organizationService.branches.mockResolvedValue(response([{ id: 10, companyId: 1, code: "B1", name: "Branch One", isActive: true }, { id: 20, companyId: 2, code: "B2", name: "Branch Two", isActive: true }]));
  documentLookupService.items.mockResolvedValue(response([]));
  documentLookupService.registrations.mockResolvedValue(response([{ id: 101, companyId: 1, branchId: 10, gstin: "29AAAAA0000A1Z5", legalName: "Company One", status: "Active" }, { id: 201, companyId: 2, gstin: "27BBBBB0000B1Z5", legalName: "Company Two", status: "Active" }]));
  partyService.getParties.mockResolvedValue(response([]));
};

describe("InvoiceFormPage ownership selectors", () => {
  beforeEach(() => { window.requestAnimationFrame = (callback) => { callback(); return 0; }; window.cancelAnimationFrame = () => {}; seed(); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("mounts with a required company and an optional branch selector", async () => {
    mount();
    await screen.findByText("Company", { selector: "label" });
    expect(selectorFor("Company")?.getAttribute("aria-required")).toBe("true");
    expect(selectorFor("Branch (optional)")?.disabled).toBe(true);
  });

  it("loads only authorized ownership data for the mounted form", async () => {
    mount();
    await waitFor(() => expect(organizationService.companies).toHaveBeenCalledWith({ activeOnly: true }));
    expect(organizationService.branches).toHaveBeenCalledWith({ activeOnly: true });
    expect(screen.getByText("Issuing GST registration")).toBeTruthy();
  });

  it("keeps the branch selector optional for company-level invoices", async () => {
    mount();
    await screen.findByText("Company", { selector: "label" });
    const branch = selectorFor("Branch (optional)");
    expect(branch?.textContent).toContain("Company-level invoice");
    expect(selectorFor("Seller GST registration")?.disabled).toBe(true);
  });
});
