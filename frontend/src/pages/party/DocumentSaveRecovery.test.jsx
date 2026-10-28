// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import InvoiceFormPage from "../sales/invoices/InvoiceFormPage";
import PurchaseDocumentFormPage from "../purchase/documents/PurchaseDocumentFormPage";
import { purchaseDocumentConfigs } from "../purchase/documents/documentConfigs";
import invoiceReducer from "../../store/slices/sales/invoiceSlice";
import billReducer from "../../store/slices/purchase/purchaseBillSlice";
import gstReducer from "../../store/slices/party/gstSlice";
import { invoiceService } from "../../services/sales/invoiceService";
import { purchaseBillService } from "../../services/purchase/purchaseBillService";
import { documentLookupService } from "../../services/documentLookupService";
import { hsnGstService } from "../../services/gst/hsnGstService";
import { partyService } from "./partyService";
import { CompanyDraftScopeContext } from "../../hooks/companyDraftScopeContext";
import DirtyWorkRouteGuard from "../../components/common/DirtyWorkRouteGuard";
import { saveAuthData } from "../../utils/authStorage";
import { readListReturnSnapshot, writeListReturnSnapshot } from "../../utils/listReturnContext";

// Keep the form, field resolver, controls, recovery hooks, reducers and thunks real.
// Only authenticated API boundaries are replaced; no provider or SQL writes occur.
vi.mock("../../services/sales/invoiceService", () => ({ invoiceService: { getInvoiceById: vi.fn(), updateInvoice: vi.fn(), createInvoice: vi.fn() } }));
vi.mock("../../services/purchase/purchaseBillService", () => ({ purchaseBillService: { getPurchaseBillById: vi.fn(), updatePurchaseBill: vi.fn(), createPurchaseBill: vi.fn(), getPurchaseBills: vi.fn() } }));
vi.mock("./partyService", () => ({ partyService: { getParties: vi.fn(), getPartyById: vi.fn(), getPartySettings: vi.fn() } }));
vi.mock("../../services/documentLookupService", () => ({ documentLookupService: { items: vi.fn(), item: vi.fn(), registrations: vi.fn() } }));
vi.mock("../../services/gst/hsnGstService", () => ({ hsnGstService: { getEffectiveClassification: vi.fn() } }));
vi.mock("../../services/manufacturing/productionApi", () => ({ default: { get: vi.fn(async url => {
  if (url !== "/api/v1/manufacturing/runtime") throw new Error(`Unexpected company context request: ${url}`);
  return { data: { succeeded: true, data: { businessDate: "2026-10-28", companyKey: "fixture-catalog", browserTimeZone: "Asia/Kolkata" } } };
}) } }));

const scope = "document-save-account-company";
const partyId = "e1a61915-521c-4d53-9f58-97c6b5091e5a";
const item = { id: "501", name: "Widget", unitId: "1", unitName: "unit", salesPrice: 10, purchasePrice: 10, isActive: true };
const line = { id: "71", itemId: item.id, itemName: item.name, itemNameSnapshot: item.name, quantity: "2", rate: 10, purchasePrice: 10, unitId: "1", discountPercentage: 0, discountAmount: 0, taxPercentage: 5, taxPercentageSnapshot: 5, hsnSacCodeSnapshot: "3923", inventoryOwner: 1 };
const baseRecord = { status: 1, discountAmount: 0, roundOff: 0, paidAmount: 0, grandTotal: 21, notes: "Server original", rowVersion: "AQ==", items: [line] };
const cases = [
  { name: "Sale invoice", id: "101", entity: "sales-invoice", key: "sales-invoices", path: "/sales/invoices", slice: "salesInvoices", Component: InvoiceFormPage, read: () => invoiceService.getInvoiceById, mutate: () => invoiceService.updateInvoice,
    record: { ...baseRecord, id: "101", invoiceNumber: "INV-101", invoiceDate: "2026-10-28", customerPartyId: partyId, companyGstRegistrationId: null, priceBasis: "", placeOfSupplyStateCode: "", placeOfSupplySource: "" } },
  { name: "Purchase Bill", id: "202", entity: "purchaseBills", key: "purchase-bills", path: "/purchase/bills", slice: "purchaseBills", Component: () => <PurchaseDocumentFormPage config={purchaseDocumentConfigs.bills} />, read: () => purchaseBillService.getPurchaseBillById, mutate: () => purchaseBillService.updatePurchaseBill,
    record: { ...baseRecord, id: "202", billNo: "PB-202", billDate: "2026-10-28", supplierId: partyId, paymentType: 1 } },
];
const auth = { roles: [], user: { id: "record-reviewer", companyKey: "fixture-catalog" }, pages: [
  { pageName: "Sales.Invoice", name: "Sales.Invoice", route: "/sales/invoices", canView: true, canEdit: true, canCreate: true },
  { pageName: "PurchaseExpense.PurchaseBill", name: "PurchaseExpense.PurchaseBill", route: "/purchase/bills", canView: true, canEdit: true, canCreate: true },
] };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const journalKey = testCase => `cosmos:draft:${scope}:${encodeURIComponent(`${testCase.entity}:save-outcome`)}:${testCase.id}`;
const draftKey = testCase => `cosmos:draft:${scope}:${testCase.entity}:${testCase.id}`;
const journal = testCase => JSON.parse(localStorage.getItem(journalKey(testCase)) || "null")?.values?.marker;
const quantity = () => document.querySelector('[name="items.0.quantity"]');
const submit = () => fireEvent.submit(quantity().closest("form"));
const Destination = () => { const location = useLocation(); return <output data-testid="destination">{JSON.stringify({ path: location.pathname, state: location.state })}</output>; };
const GuardLayout = () => <><DirtyWorkRouteGuard /><Outlet /></>;

function mount(testCase, state) {
  const gst = gstReducer(undefined, { type: "@init" });
  const store = configureStore({ reducer: { auth: () => auth, salesInvoices: invoiceReducer, purchaseBills: billReducer, partyGst: gstReducer }, preloadedState: { partyGst: { ...gst, config: { ...gst.config, loaded: true, available: false } } } });
  const router = createMemoryRouter([{ element: <GuardLayout />, children: [
    { path: `${testCase.path}/:id/edit`, element: <testCase.Component /> },
    { path: `${testCase.path}/:id`, element: <Destination /> },
    { path: testCase.path, element: <Destination /> },
  ] }], { initialEntries: [{ pathname: `${testCase.path}/${testCase.id}/edit`, state }] });
  const view = render(<Provider store={store}><CompanyDraftScopeContext.Provider value={scope}><RouterProvider router={router} /></CompanyDraftScopeContext.Provider></Provider>);
  return { ...view, store, router };
}
async function expectLoaded(testCase) {
  await waitFor(() => expect(quantity()?.value).toBe("2"));
  await waitFor(() => expect(testCase.read()).toHaveBeenCalledOnce());
  await waitFor(() => expect(quantity().closest("fieldset").disabled).toBe(false));
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
  saveAuthData({ ...auth, accessToken: "fixture-token", refreshToken: "fixture-refresh" });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.stubGlobal("requestAnimationFrame", callback => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", id => clearTimeout(id));
  Element.prototype.scrollIntoView = vi.fn();
  partyService.getParties.mockResolvedValue({ data: { items: [{ id: partyId, partyName: "Buyer and supplier", partyType: "Both", isActive: true }] } });
  partyService.getPartyById.mockResolvedValue({ data: { id: partyId, partyName: "Buyer and supplier", partyType: "Both", isActive: true } });
  partyService.getPartySettings.mockResolvedValue({ data: { enableShippingAddress: true, enablePartyStatus: true } });
  documentLookupService.items.mockResolvedValue({ data: { items: [item] } });
  documentLookupService.item.mockResolvedValue({ data: item });
  documentLookupService.registrations.mockResolvedValue({ data: { items: [] } });
  hsnGstService.getEffectiveClassification.mockResolvedValue({ data: { code: "3923", source: "Effective test fixture" } });
  for (const testCase of cases) testCase.read().mockResolvedValue({ data: structuredClone(testCase.record) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(cases)("Actual Redux $name save outcome", testCase => {
  it.each([400, 422])("keeps a known %s indexed line error editable and focuses its real input", async status => {
    testCase.mutate().mockRejectedValue({ response: { status, data: { message: "Review the line", errors: { "Request.Items[0].Quantity": ["Quantity exceeds the permitted remaining amount."] } } } });
    const { store } = mount(testCase); await expectLoaded(testCase);
    fireEvent.change(quantity(), { target: { value: "3.000001" } }); submit();
    const jump = await screen.findByRole("button", { name: "Review Line 1: Quantity" });
    fireEvent.click(jump); await waitFor(() => expect(document.activeElement).toBe(quantity()));
    expect(quantity().value).toBe("3.000001"); expect(quantity().matches(":disabled")).toBe(false);
    expect(screen.queryByText("Save result needs review")).toBeNull(); expect(journal(testCase)).toBeUndefined();
    expect(testCase.mutate()).toHaveBeenCalledOnce(); expect(typeof store.getState()[testCase.slice].error).toBe("string");
  });

  it.each(["503", "network"])("journals before an unchanged-edit request, retains a %s outcome after reopening, and requires explicit review", async failure => {
    const pending = deferred(); testCase.mutate().mockReturnValue(pending.promise);
    const first = mount(testCase); await expectLoaded(testCase);
    // No edit is made: even a non-dirty submit must journal before the request.
    submit(); await waitFor(() => expect(testCase.mutate()).toHaveBeenCalledOnce());
    expect(journal(testCase)).toMatchObject({ phase: "AwaitingResponse", recordId: testCase.id });
    expect(quantity().matches(":disabled")).toBe(true);
    await act(async () => pending.reject(failure === "503" ? { response: { status: 503, data: { message: "Gateway lost result" } } } : new Error("Network disconnected after request")));
    await screen.findByText("Save result needs review");
    expect(journal(testCase)).toMatchObject({ phase: "OutcomeUnknown", recordId: testCase.id });
    const attemptId = journal(testCase).attemptId;
    // A GET sees a different server value. Readback must not dispatch a detail reset,
    // overwrite retained input, clear uncertainty or repeat the mutation.
    testCase.read().mockResolvedValue({ data: { ...testCase.record, items: [{ ...line, quantity: "4" }], notes: "Server observation" } });
    fireEvent.click(screen.getByRole("button", { name: "Read current saved record" }));
    await screen.findByText(/Readback does not repeat the save/);
    expect(quantity().value).toBe("2"); expect(first.store.getState()[testCase.slice].selected.items[0].quantity).toBe("2");
    expect(journal(testCase).attemptId).toBe(attemptId); expect(quantity().matches(":disabled")).toBe(true);
    submit(); await act(async () => {}); expect(testCase.mutate()).toHaveBeenCalledOnce();
    first.unmount();
    const reopened = mount(testCase);
    // The journal locks the form immediately, before the async record GET and before
    // the optional stored-values restore can be clicked.
    expect(screen.getByText("Save result needs review")).toBeTruthy();
    await waitFor(() => expect(quantity()?.value).toBe("4"));
    const restore = screen.getByRole("button", { name: "Restore for review" });
    expect(restore.matches(":disabled")).toBe(true); expect(quantity().matches(":disabled")).toBe(true);
    expect(JSON.parse(localStorage.getItem(draftKey(testCase))).values.items[0].quantity).toBe("2");
    submit(); await act(async () => {}); expect(testCase.mutate()).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Allow a reviewed retry" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed saved records/ }));
    fireEvent.click(screen.getByRole("button", { name: "Allow a reviewed retry" }));
    expect(screen.queryByText("Save result needs review")).toBeNull(); expect(journal(testCase)).toBeUndefined();
    expect(quantity().matches(":disabled")).toBe(false); expect(quantity().value).toBe("4");
    expect(testCase.mutate()).toHaveBeenCalledOnce(); // No automatic replay or restore.
    fireEvent.click(screen.getByRole("button", { name: "Restore for review" }));
    expect(quantity().value).toBe("2");
    testCase.mutate().mockResolvedValue({ data: testCase.record }); submit();
    await screen.findByTestId("destination"); expect(testCase.mutate()).toHaveBeenCalledTimes(2);
    expect(journal(testCase)).toBeUndefined(); expect(reopened.router.state.location.pathname).toBe(`${testCase.path}/${testCase.id}`);
  });

  it("marks the exact saved row and propagates captured list context to detail only after an authoritative response", async () => {
    const pending = deferred(); testCase.mutate().mockReturnValue(pending.promise);
    const context = { version: 1, scope, key: testCase.key, token: "captured-document-origin", path: `${testCase.path}?review=retained` };
    writeListReturnSnapshot({ ...context, filters: { filters: { Search: "remembered" }, pageNumber: 3, pageSize: 25 }, scroll: { x: 0, y: 610 } });
    mount(testCase, { returnTo: context.path, listReturn: context }); await expectLoaded(testCase);
    fireEvent.change(quantity(), { target: { value: "3.000001" } }); submit();
    await waitFor(() => expect(testCase.mutate()).toHaveBeenCalledOnce());
    expect(screen.queryByTestId("destination")).toBeNull(); expect(readListReturnSnapshot(scope, testCase.key).highlight).toBeUndefined();
    await act(async () => pending.resolve({ data: testCase.record }));
    const result = JSON.parse((await screen.findByTestId("destination")).textContent);
    expect(result).toMatchObject({ path: `${testCase.path}/${testCase.id}`, state: { returnTo: context.path, listReturn: context } });
    expect(readListReturnSnapshot(scope, testCase.key)).toMatchObject({ highlight: { id: testCase.id }, filters: { pageNumber: 3 }, scroll: { y: 610 } });
    expect(journal(testCase)).toBeUndefined(); expect(localStorage.getItem(draftKey(testCase))).toBeNull(); expect(window.confirm).not.toHaveBeenCalled();
  });
});
