// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  access: {}, production: true,
  machines: Object.fromEntries(["getMachines", "getMachineById", "createMachine", "updateMachine", "deleteMachine"].map(key => [key, vi.fn()])),
  reasons: Object.fromEntries(["getDowntimeReasons", "getDowntimeReasonById", "createDowntimeReason", "updateDowntimeReason", "deleteDowntimeReason"].map(key => [key, vi.fn()])),
}));
vi.mock("./useOeeCapabilities", () => ({ default: options => options.pageName === "OEE.ProductionEntries" ? { canView: f.production } : f.access }));
vi.mock("../../services/oee/oeeMachineService", () => ({ oeeMachineService: f.machines }));
vi.mock("../../services/oee/oeeDowntimeReasonService", () => ({ oeeDowntimeReasonService: f.reasons }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import OeeMachinesPage from "./machines/OeeMachinesPage";
import OeeDowntimeReasonsPage from "./downtimeReasons/OeeDowntimeReasonsPage";
import machines from "../../store/slices/oee/oeeMachineSlice";
import reasons from "../../store/slices/oee/oeeDowntimeReasonSlice";

const machine = { id: 7, machineCode: "IM-01", machineName: "Injection One", tonnage: "135T", location: "Shop Floor A", displayOrder: 2, isActive: true };
const reason = { id: 9, reasonName: "Mould change", isActive: true };
const page = rows => ({ data: { items: rows, pageNumber: 1, pageSize: 20, totalCount: rows.length, totalPages: 1 } });
const mount = (Component = OeeMachinesPage) => render(<Provider store={configureStore({ reducer: { oeeMachines: machines, oeeDowntimeReasons: reasons } })}><MemoryRouter><Component /></MemoryRouter></Provider>);
beforeEach(() => {
  Object.values(f.machines).forEach(mock => mock.mockReset());
  Object.values(f.reasons).forEach(mock => mock.mockReset());
  f.access = { canView: true, canCreate: true, canEdit: true, canUpdate: true, canDelete: true };
  f.production = true;
  f.machines.getMachines.mockResolvedValue(page([machine]));
  f.machines.getMachineById.mockResolvedValue({ data: { ...machine, machineName: "Injection One · saved" } });
  f.machines.updateMachine.mockResolvedValue({ data: machine });
  f.reasons.getDowntimeReasons.mockResolvedValue(page([reason]));
  f.reasons.getDowntimeReasonById.mockResolvedValue({ data: reason });
  f.reasons.createDowntimeReason.mockResolvedValue({ data: { id: 10, reasonName: "Material shortage", isActive: true } });
});
afterEach(cleanup);

describe("OEE master workflows", () => {
  it("keeps one set of record actions and shows current saved details before editing", async () => {
    mount();
    const view = await screen.findByRole("button", { name: "View Machine" });
    expect(screen.getAllByRole("button", { name: "Edit Machine" })).toHaveLength(1);
    fireEvent.click(view);
    await screen.findByRole("heading", { name: "Injection One · saved" });
    const dialog = within(screen.getByRole("dialog", { name: "Machine details" }));
    expect(f.machines.getMachineById).toHaveBeenCalledWith(7);
    expect(dialog.getByRole("link", { name: "Production entries" }).getAttribute("href")).toBe("/oee/production-entries");
    expect(dialog.queryByRole("textbox")).toBeNull();
  });

  it("withholds an edit form after failed detail read and supports retry", async () => {
    f.machines.getMachineById.mockRejectedValueOnce(new Error("Machine details unavailable"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Machine" }));
    await screen.findByRole("heading", { name: "Saved details could not be loaded" });
    const dialog = within(screen.getByRole("dialog", { name: "Edit Machine" }));
    expect(dialog.queryByRole("button", { name: "Save Changes" })).toBeNull();
    expect(dialog.queryByRole("textbox", { name: /Machine Name/ })).toBeNull();
    fireEvent.click(dialog.getByRole("button", { name: "Retry saved details" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: /Machine Name/ }).value).toBe("Injection One · saved"));
    expect(f.machines.updateMachine).not.toHaveBeenCalled();
  });

  it("quick-adds a new active reason after cancelling an edit without updating the old record", async () => {
    mount(OeeDowntimeReasonsPage);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Downtime Reason" }));
    await screen.findByRole("textbox", { name: /Reason Name/ });
    const dialog = within(screen.getByRole("dialog", { name: "Edit Downtime Reason" }));
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    const quick = within(screen.getByRole("form", { name: "Quick add downtime reason" }));
    fireEvent.change(quick.getByRole("textbox", { name: "New reason name" }), { target: { value: "  Material shortage  " } });
    fireEvent.submit(screen.getByRole("form", { name: "Quick add downtime reason" }));
    await waitFor(() => expect(f.reasons.createDowntimeReason).toHaveBeenCalledWith({ reasonName: "Material shortage", isActive: true }));
    expect(f.reasons.updateDowntimeReason).not.toHaveBeenCalled();
    await waitFor(() => expect(quick.getByRole("textbox", { name: "New reason name" }).value).toBe(""));
  });

  it("hides mutation actions and the production link without their permissions", async () => {
    f.access = { canView: true, canCreate: false, canEdit: false, canUpdate: false, canDelete: false };
    f.production = false;
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "View Machine" }));
    await screen.findByRole("heading", { name: "Injection One · saved" });
    const dialog = within(screen.getByRole("dialog", { name: "Machine details" }));
    expect(dialog.queryByRole("link", { name: "Production entries" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Machine" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Machine" })).toBeNull();
  });
});
