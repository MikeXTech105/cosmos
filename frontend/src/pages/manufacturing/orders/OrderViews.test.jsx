import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ access: { canView: true, canCreate: true, canUpdate: true, canApprove: true }, resource: null }));
vi.mock("./orderHooks", async (original) => ({ ...(await original()), useOrderCapabilities: () => state.access, useItemLabels: () => (id) => `Item ${id}`, useAsyncResource: () => state.resource }));
vi.mock("../../../hooks/useProductionRuntime", () => ({ default: () => ({ runtime: { businessDate: "2026-10-27", businessTimeZone: "Asia/Kolkata" } }) }));
vi.mock("../../../services/manufacturing/productionOrderService", () => ({ default: {} }));
import OrdersPage from "./OrdersPage";
import OrderDetailPage from "./OrderDetailPage";
import OrderCapacity from "./OrderCapacity";
import OrderCommandModal from "./OrderCommandModal";

const order = { id: 7, orderNumber: "PRO-00000007", status: 3, businessDate: "2026-10-27", plannedStart: "2026-10-27", dueDate: "2026-10-28", itemId: 4, unitId: 2, bomId: 5, routingId: 6, machineId: 1, mouldId: 2, shiftId: 3, version: "v2", revision: 2, plannedQuantity: "10", releasedQuantity: "8", completedQuantity: "3.000001", rejectedQuantity: "1", remainingQuantity: "3.999999" };
const render = (element) => renderToStaticMarkup(<Provider store={configureStore({ reducer: () => ({ auth: { user: null, pages: [], roles: [] } }) })}><MemoryRouter>{element}</MemoryRouter></Provider>);
describe("production order views and access", () => {
  beforeEach(() => {
    state.access = { canView: true, canCreate: true, canUpdate: true, canApprove: true };
    state.resource = { data: null, busy: false, error: "", reload: vi.fn() };
  });
  it("shows server quantities, distinct lifecycle status and source drilldown in the paged list", () => {
    state.resource.data = { items: [order], totalCount: 1, totalPages: 1, pageNumber: 1, pageSize: 50 };
    const html = render(<OrdersPage />);
    expect(html).toContain('href="/manufacturing/orders/7"');
    expect(html).toContain("In progress");
    expect(html).toContain("3.000001");
    expect(html).toContain("3.999999");
    expect(html).toContain("Rejected");
    expect(html).toContain('href="/manufacturing/orders/new"');
  });
  it("renders full-filter SQL summary casing with exact quantities and unknown output on an empty later page", () => {
    state.resource.data = { items: [], totalCount: 42, totalPages: 3, pageNumber: 3, pageSize: 20, summary: [{ UnitId: 2, PlannedQuantity: "1234567890123456.000001", ReleasedQuantity: "3", CompletedQuantity: null, RejectedQuantity: "0.000001", RemainingQuantity: "2.999999" }] };
    const html = render(<OrdersPage />);
    expect(html).toContain("Filtered totals by base unit");
    expect(html).toContain("No orders on this page");
    expect(html).not.toContain("No production orders</h3>");
    expect(html).toContain("1234567890123456.000001");
    expect(html).toContain("0.000001");
    expect(html).toContain("2.999999");
    expect(html).toContain("42");
    expect(html).toContain("—");
  });
  it("hides create and all approved lifecycle commands from a view-only user", () => {
    state.access = { canView: true, canCreate: false, canUpdate: false, canApprove: false };
    state.resource.data = { order, materials: [], completions: [], reservations: [] };
    const html = render(<OrderDetailPage />);
    expect(html).not.toContain("Record partial completion</button>");
    expect(html).not.toContain("Amend release</button>");
    expect(html).not.toContain("Cancel remainder</button>");
    expect(html).toContain("Current version");
  });
  it("does not offer reverse on reversal entries or already reversed originals", () => {
    state.resource.data = { order, materials: [], reservations: [], completions: [{ id: 1, goodOutput: "2", rejectedOutput: "1", reversedById: 2 }, { id: 2, goodOutput: "2", rejectedOutput: "1", reversalOfId: 1 }] };
    const html = render(<OrderDetailPage />);
    expect(html).toContain("Reversed by #2");
    expect(html).toContain("Reversal #2 of completion #1");
    expect(html).not.toContain("Reverse linked completion</button>");
  });
  it("keeps actual consumed, scrap and staging return visible alongside immutable history", () => {
    state.resource.data = { order, materials: [{ id: 1, itemId: 9, unitId: 2, sourceComponentQuantity: "0.333333333333", outputBaseQuantity: "1", quantityPerOutput: "0.333333333333", requiredQuantity: "3", consumedQuantity: "1.5" }], reservations: [{ itemId: 9, unitId: 2, reservedQuantity: "3", consumedQuantity: "1.5", releasedQuantity: "0", remainingQuantity: "1.5", onHandQuantity: "100", freeQuantity: "98.5" }], completions: [{ id: 12, goodOutput: "2", rejectedOutput: "1", materials: [{ itemId: 9, unitId: 2, expectedQuantity: "1.5", consumedQuantity: "1", scrapQuantity: "0.5", returnedQuantity: "2" }] }] };
    const html = render(<OrderDetailPage />);
    expect(html).toContain("0.333333333333");
    expect(html).toContain("Frozen expected partial");
    expect(html).toContain("Staging returned");
    expect(html).toContain("Current owned reservation and stock");
    expect(html).toContain("98.5");
  });
  it("shows unknown capacity as unavailable and disables approval; never fabricates zero minutes", () => {
    state.resource.data = { version: "v2", timeZone: "India Standard Time", lines: [{ routingStepId: 1, sequence: 1, workCentreId: 2, shiftId: 3, requiredMinutes: null, availableMinutes: null, conflictCode: "UNKNOWN_RATE", explanation: "Verified rate mapping is missing." }] };
    const html = render(<OrderCapacity order={order} canApprove rescheduleRequired onScheduled={vi.fn()} onConflict={vi.fn()} />);
    expect(html).toContain("India Standard Time");
    expect(html).toContain("UNKNOWN_RATE");
    expect(html).toContain("Verified rate mapping is missing.");
    expect(html).toContain("previous booking");
    expect(html).toMatch(/disabled=""[^>]*>Approve ordered booking/);
  });
  it("does not expose order details without view permission", () => {
    state.access = { canView: false };
    expect(render(<OrdersPage />)).toContain("do not have permission");
    expect(render(<OrdersPage />)).not.toContain("Find orders");
  });
  it("renders independent actual completion fields and explicit offset input with the stock ownership explanation", () => {
    const context = { order, materials: [{ id: 10, itemId: 9, unitId: 2, requiredQuantity: "3", consumedQuantity: "0" }] };
    const html = render(<OrderCommandModal action="complete" context={context} runtime={{ businessDate: "2026-10-27", businessTimeZone: "India Standard Time" }} onClose={vi.fn()} onSaved={vi.fn()} onConflict={vi.fn()} />);
    expect(html).toContain("Accepted good output");
    expect(html).toContain("Rejected output");
    expect(html).toContain("Consumed · Item #9");
    expect(html).toContain("Scrap · Item #9");
    expect(html).toContain("Returned · Item #9");
    expect(html).toContain("Actual timestamp with UTC offset");
    expect(html).toContain("Staging returned was never consumed");
  });
  it("provides a saved server recommendation refresh for linked amendments without editable source IDs", () => {
    const context = { order: { ...order, sourcePlanId: "11111111-2222-3333-4444-555555555555" }, materials: [] };
    const html = render(<OrderCommandModal action="amend" context={context} runtime={{ businessDate: "2026-10-27" }} onClose={vi.fn()} onSaved={vi.fn()} onConflict={vi.fn()} />);
    expect(html).toContain("Save fresh amendment source");
    expect(html).toContain("Observed demand from");
    expect(html).toContain("21-day total top-up");
    expect(html).toMatch(/readOnly=""[^>]*value="11111111-2222-3333-4444-555555555555"/);
  });
});
