// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rights: new Set(), api: { items: vi.fn(), item: vi.fn(), machines: vi.fn(), moulds: vi.fn(), shifts: vi.fn(), channels: vi.fn(), configuration: vi.fn(), applicableBom: vi.fn(), getById: vi.fn(), workCentreShifts: vi.fn(), update: vi.fn() } }));
vi.mock("../../../hooks/useCapabilities", () => ({ default: ({ pageName }) => ({ canView: state.rights.has(pageName), canCreate: pageName === "Manufacturing.Orders", canUpdate: pageName === "Manufacturing.Orders", canApprove: false }) }));
vi.mock("../../../hooks/useProductionRuntime", () => ({ default: () => ({ runtime: { businessDate: "2026-10-27", browserTimeZone: "Asia/Kolkata", businessTimeZone: "India Standard Time" }, loading: false, error: "" }) }));
vi.mock("../../../services/manufacturing/productionOrderService", () => ({ default: state.api }));
vi.mock("../../procurement/ProcurementShared", () => ({ ProcurementItemAutocomplete: (props) => <input aria-label={props.label} disabled={props.disabled} readOnly data-precise-loader={props.loader === state.api.items} /> }));
import OrderFormPage from "./OrderFormPage";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  state.rights = new Set(["Manufacturing.Orders", "OEE.Machines"]);
  state.api.machines.mockResolvedValue({ data: { items: [], totalCount: 0, totalPages: 0 } });
});

describe("production order lookup access", () => {
  it("requests only independently allowed masters and cannot submit an unreviewable manufactured Item", async () => {
    render(<MemoryRouter initialEntries={["/manufacturing/orders/new?itemId=9007199254740993&quantity=2&businessDate=2026-10-27"]}><OrderFormPage /></MemoryRouter>);
    await waitFor(() => expect(state.api.machines).toHaveBeenCalledOnce());
    await screen.findByText(/Order entry needs View access/);
    for (const key of ["item", "items", "moulds", "shifts", "channels", "configuration", "applicableBom"]) expect(state.api[key]).not.toHaveBeenCalled();
    const selected = screen.getByLabelText("Manufactured finished Item");
    expect(selected.disabled).toBe(true);
    expect(selected.dataset.preciseLoader).toBe("true");
    expect(screen.getByRole("button", { name: "Save draft" }).disabled).toBe(true);
  });

  it("does not request any order-entry lookups without module View access", async () => {
    state.rights = new Set(["OEE.Machines", "OEE.Moulds", "Items"]);
    render(<MemoryRouter><OrderFormPage /></MemoryRouter>);
    expect(screen.getByText(/You do not have permission/)).toBeTruthy();
    await waitFor(() => expect(state.api.machines).not.toHaveBeenCalled());
    for (const key of Object.keys(state.api)) expect(state.api[key]).not.toHaveBeenCalled();
  });

  it("resolves future-start BOM/resources and the route's shared shifts against planned start, not journal business date", async () => {
    state.rights = new Set(["Manufacturing.Orders", "Items", "Manufacturing.Boms", "Manufacturing.Configuration", "OEE.Machines", "OEE.Moulds", "HR.Shift", "SupplyChain.Channels"]);
    state.api.getById.mockResolvedValue({ data: { id: 7, status: 1, itemId: 4, bomId: 5, routingId: 6, machineId: 11, mouldId: 21, shiftId: 3, plannedQuantity: "2", businessDate: "2026-10-27", plannedStart: "2026-11-01", dueDate: "2026-11-02", version: "0x0000000000000010" } });
    state.api.item.mockResolvedValue({ data: { id: 4, name: "Manufactured component", unitId: 2, isManufactured: true, trackInventory: true, isActive: true } });
    state.api.configuration.mockResolvedValue({ data: { routings: [{ id: 6, isActive: true, effectiveFrom: "2026-11-01", steps: [{ workCentreId: 9, machineId: 11 }, { workCentreId: 10, mouldId: 21 }] }], eligibility: [{ id: 1, machineId: 11, mouldId: 21, effectiveFrom: "2026-11-01", isActive: true }] } });
    state.api.applicableBom.mockResolvedValue({ data: { id: 5, version: 1, outputBaseQuantity: "1", components: [] } });
    state.api.moulds.mockResolvedValue({ data: { items: [], totalPages: 0 } });
    state.api.shifts.mockResolvedValue({ data: { items: [{ id: 3, shiftName: "Shared future shift" }], totalPages: 1 } });
    state.api.channels.mockResolvedValue({ data: { items: [], totalPages: 0 } });
    state.api.workCentreShifts.mockImplementation(async () => ({ data: { shifts: [{ id: 1, shiftId: 3, isActive: true, effectiveFrom: "2026-11-01" }] } }));
    render(<MemoryRouter initialEntries={["/manufacturing/orders/7/edit"]}><Routes><Route path="/manufacturing/orders/:id/edit" element={<OrderFormPage />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(state.api.applicableBom).toHaveBeenCalled());
    expect(state.api.applicableBom.mock.calls.every(([, date]) => date === "2026-11-01")).toBe(true);
    await waitFor(() => expect(state.api.workCentreShifts).toHaveBeenCalledTimes(2));
    expect(state.api.workCentreShifts.mock.calls.map(([id]) => id)).toEqual(["9", "10"]);
    expect(await screen.findByText("Shared future shift")).toBeTruthy();
  });

  it("blocks an uncertain draft edit until a successful read returns its actual current version", async () => {
    state.rights = new Set(["Manufacturing.Orders", "Items", "Manufacturing.Boms", "Manufacturing.Configuration", "OEE.Machines", "OEE.Moulds", "HR.Shift", "SupplyChain.Channels"]);
    const record = { id: 7, status: 1, itemId: 4, bomId: 5, routingId: 6, machineId: 11, mouldId: 21, shiftId: 3, plannedQuantity: "2.000001", businessDate: "2026-10-27", plannedStart: "2026-10-27", dueDate: "2026-10-28", version: "0x0000000000000010" };
    state.api.getById.mockResolvedValueOnce({ data: record }).mockRejectedValueOnce(new Error("Read is unavailable")).mockResolvedValue({ data: { ...record, version: "0x0000000000000011" } });
    state.api.item.mockResolvedValue({ data: { id: 4, name: "Finished component", unitId: 2, isManufactured: true, trackInventory: true, isActive: true } });
    state.api.machines.mockResolvedValue({ data: { items: [{ id: 11, isActive: true }], totalPages: 1 } });
    state.api.moulds.mockResolvedValue({ data: { items: [{ id: 21, isActive: true }], totalPages: 1 } });
    state.api.shifts.mockResolvedValue({ data: { items: [{ id: 3, isActive: true }], totalPages: 1 } });
    state.api.channels.mockResolvedValue({ data: { items: [], totalPages: 0 } });
    state.api.configuration.mockResolvedValue({ data: { routings: [{ id: 6, effectiveFrom: "2026-10-01", steps: [{ workCentreId: 9 }] }], eligibility: [{ machineId: 11, mouldId: 21, effectiveFrom: "2026-10-01" }] } });
    state.api.workCentreShifts.mockResolvedValue({ data: { shifts: [{ id: 1, shiftId: 3, effectiveFrom: "2026-10-01" }] } });
    state.api.applicableBom.mockResolvedValue({ data: { id: 5, version: 1, outputBaseQuantity: "1", components: [] } });
    state.api.update.mockRejectedValueOnce(new Error("Write response was lost")).mockResolvedValue({ data: { id: 7 } });
    render(<MemoryRouter initialEntries={["/manufacturing/orders/7/edit"]}><Routes><Route path="/manufacturing/orders/:id/edit" element={<OrderFormPage />} /><Route path="/manufacturing/orders/:id" element={<p>Updated draft reviewed</p>} /></Routes></MemoryRouter>);
    await waitFor(() => expect(state.api.workCentreShifts).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" }).disabled).toBe(false));
    const submit = screen.getByRole("button", { name: "Save draft" });
    fireEvent.submit(submit.closest("form"));
    await waitFor(() => expect(state.api.update).toHaveBeenCalledOnce());
    await screen.findByText(/saved draft must be reloaded successfully/);
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form"));
    expect(state.api.update).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText(/Read is unavailable/);
    expect(screen.getByRole("button", { name: "Save draft" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" }).disabled).toBe(false));
    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form"));
    await screen.findByText("Updated draft reviewed");
    expect(state.api.update).toHaveBeenCalledTimes(2);
    expect(state.api.update.mock.calls[0][1].version).toBe("0x0000000000000010");
    expect(state.api.update.mock.calls[1][1].version).toBe("0x0000000000000011");
  });
});
