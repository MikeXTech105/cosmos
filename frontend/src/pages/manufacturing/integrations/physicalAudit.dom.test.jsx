// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ permissions: {}, saved: false, api: Object.fromEntries(["shipmentDetail", "shipmentLinks", "packingContext", "invoiceOwnership", "invoiceDetail", "listInvoices", "packagingProfiles", "itemDetail", "saveShipmentLinks"].map(key => [key, vi.fn()])) }));
vi.mock("../../../hooks/useCapabilities", () => ({ default: ({ pageName }) => fixture.permissions[pageName] ?? { canView: true, canApprove: true } }));
vi.mock("../../../services/manufacturing/physicalInventoryService", () => ({ physicalInventoryService: fixture.api }));
vi.mock("../../../components/common/AppSelect", () => ({ default: ({ label, options = [], value, onChange, disabled, ...props }) => <label>{label}<select aria-label={props["aria-label"] ?? label} value={value ?? ""} disabled={disabled} onChange={event => onChange(event.target.value)}><option value="">Choose</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }));
import ShipmentPhysicalPanel from "./ShipmentPhysicalPanel";
import { reviewPhysical, usePhysicalCommand } from "./physicalHooks";

const shipment = { id: 1, status: 1, shipmentDate: "2026-10-27", items: [{ id: 11, itemId: 8, plannedQuantity: "0.000003", itemName: "Exact component" }] };
const version = "0x0000000000000001";
const response = data => ({ data });
const selectAllocation = async () => {
  // Exercise the real 250ms lookup debounce deterministically. The whole suite
  // may run alongside a build, so wall-clock retry windows do not prove readiness.
  expect(fixture.api.listInvoices).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(249); });
  expect(fixture.api.listInvoices).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(fixture.api.listInvoices).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("option", { name: "INV-6 · Customer" })).toBeTruthy();
  await act(async () => { fireEvent.change(screen.getByRole("combobox", { name: "Existing sales invoice" }), { target: { value: "6" } }); });
  expect(screen.getByRole("option", { name: /· 0\.000002$/ })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Shipment line" }), { target: { value: "11" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Shipment-owned invoice line" }), { target: { value: "21" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Linked quantity" }), { target: { value: "0.000001" } });
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fixture.permissions = { "Items": { canView: false }, "SupplyChain.PackagingProfiles": { canView: false } };
  fixture.saved = false;
  Object.values(fixture.api).forEach(mock => mock.mockReset());
  fixture.api.shipmentDetail.mockResolvedValue(response(shipment));
  fixture.api.shipmentLinks.mockImplementation(async () => response({ id: 1, version, lines: fixture.saved ? [{ shipmentItemId: 11, invoiceLineId: 21, invoiceId: 6, quantity: "0.000001" }] : [] }));
  fixture.api.packingContext.mockResolvedValue(response({ id: 1, version, lines: [{ shipmentItemId: 11, itemId: 8, unitId: 3 }] }));
  fixture.api.listInvoices.mockResolvedValue(response({ items: [{ id: 6, invoiceNumber: "INV-6", customerName: "Customer" }], totalCount: 1 }));
  fixture.api.invoiceOwnership.mockResolvedValue(response({ id: 6, version, lines: [{ invoiceLineId: 21, itemId: 8, unitId: 3, owner: 2, quantity: "0.000002" }] }));
  fixture.api.invoiceDetail.mockResolvedValue(response({ id: 6, items: [{ id: 21, itemId: 8, itemName: "Exact component" }] }));
  fixture.api.saveShipmentLinks.mockImplementation(async () => { fixture.saved = true; return response({ id: 1, version, status: "Saved" }); });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });

describe("fresh physical source audit", () => {
  it("blocks a legacy unknown shipment base unit before any invoice allocation write", async () => {
    fixture.api.packingContext.mockResolvedValue(response({ id: 1, version, lines: [{ shipmentItemId: 11, itemId: 8, unitId: null }] }));
    render(<MemoryRouter><ShipmentPhysicalPanel shipment={shipment} onSaved={async () => true} /></MemoryRouter>);
    await selectAllocation();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save invoice allocations" })); });
    expect(screen.getByText("Verify the shipment's real base unit and reload its packing and invoice context before linking quantities.")).toBeTruthy();
    expect(fixture.api.saveShipmentLinks).not.toHaveBeenCalled();
  });
  it("does not mutate from a legacy parent fallback when the exact invoice source read failed", async () => {
    fixture.api.invoiceDetail.mockRejectedValue(new Error("Exact invoice read unavailable"));
    render(<MemoryRouter><ShipmentPhysicalPanel shipment={shipment} onSaved={async () => true} /></MemoryRouter>);
    await selectAllocation();
    expect(screen.getByText("Exact invoice read unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save invoice allocations" }).disabled).toBe(true);
    expect(fixture.api.saveShipmentLinks).not.toHaveBeenCalled();
  });
  it("retains the committed/readback-failed lock and inspects the saved allocation before accepting another intent", async () => {
    const onSaved = vi.fn().mockResolvedValue(false);
    render(<MemoryRouter><ShipmentPhysicalPanel shipment={shipment} onSaved={onSaved} /></MemoryRouter>);
    await selectAllocation();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save invoice allocations" })); });
    expect(screen.getByText("The command completed, but refreshing its context failed. Reload and inspect the saved document before another action.")).toBeTruthy();
    expect(fixture.api.saveShipmentLinks).toHaveBeenCalledTimes(1);
    expect(fixture.api.saveShipmentLinks.mock.calls[0][1].lines).toEqual([{ shipmentItemId: 11, invoiceLineId: 21, quantity: "0.000001" }]);
    expect(screen.getByRole("button", { name: "Save invoice allocations" }).disabled).toBe(true);
    onSaved.mockResolvedValue(true);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reload context" })); });
    expect(screen.getByRole("button", { name: "Save invoice allocations" }).disabled).toBe(false);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save invoice allocations" })); });
    expect(screen.getByText("This shipment / invoice line pair is already linked. Inspect its saved quantity before another allocation.")).toBeTruthy();
    expect(fixture.api.saveShipmentLinks).toHaveBeenCalledTimes(1);
  });
  it("keeps invoice reads behind invoice View while allowing the independent shipment packing read", async () => {
    fixture.permissions["Sales.Invoice"] = { canView: false, canApprove: false };
    render(<MemoryRouter><ShipmentPhysicalPanel shipment={shipment} onSaved={async () => true} /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(fixture.api.packingContext).toHaveBeenCalledWith(1, expect.anything());
    expect(fixture.api.shipmentLinks).not.toHaveBeenCalled();
    expect(fixture.api.listInvoices).not.toHaveBeenCalled();
    expect(fixture.api.invoiceOwnership).not.toHaveBeenCalled();
  });
});

describe("physical command readback boundary", () => {
  it("locks duplicate clicks and blocks a new command after an unconfirmed parent refresh", async () => {
    let resolve;
    const send = vi.fn().mockImplementation(() => new Promise(done => { resolve = done; }));
    const saved = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePhysicalCommand(saved));
    let pending;
    act(() => { pending = result.current.run("receive:1", { version, quantity: "0.000001" }, send); });
    await act(async () => { await result.current.run("receive:1", { version, quantity: "0.000001" }, send); });
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(response({ id: 1 })); await pending; });
    expect(result.current.conflict).toBe(true);
    await act(async () => { await result.current.run("receive:1", { version, quantity: "0.000002" }, send); });
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => { await reviewPhysical(result.current, async () => undefined); });
    expect(result.current.conflict).toBe(true);
    await act(async () => { await reviewPhysical(result.current, async () => true); });
    expect(result.current.conflict).toBe(false);
  });
});
