// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ dropdown: vi.fn() }));
vi.mock("../../../services/supplyChain/warehouseService", () => ({ supplyChainWarehouseService: { dropdown: f.dropdown } }));
vi.mock("../../../components/common/AppSelect", () => ({ default: ({ label, options = [], value, onChange, disabled }) => <label>{label}<select aria-label={label} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}><option value="">Choose</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }));
import { ManualEntryWizard } from "./DispatchImportsPage";
const warehouse = (id, suffix) => ({ id, warehouseCode: `W${suffix}`, warehouseName: `Warehouse ${suffix}` });
const mount = () => render(<MemoryRouter><ManualEntryWizard canCreate channels={[{ id: 1, code: "C1", name: "First" }, { id: 2, code: "C2", name: "Second" }]} onCommitted={vi.fn()} onHistory={vi.fn()} /></MemoryRouter>);
beforeEach(() => f.dropdown.mockReset());
afterEach(cleanup);
describe("dispatch manual warehouse ownership", () => {
  it("clears a selected warehouse immediately when the channel changes, before its next lookup finishes", async () => {
    let second;
    f.dropdown.mockResolvedValueOnce({ data: [warehouse(11, 1)] }).mockImplementationOnce(() => new Promise(resolve => { second = resolve; }));
    mount();
    fireEvent.change(screen.getByRole("combobox", { name: "Channel" }), { target: { value: "1" } });
    await screen.findByRole("option", { name: "W1 — Warehouse 1" });
    fireEvent.change(screen.getByRole("combobox", { name: "Warehouse" }), { target: { value: "11" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Channel" }), { target: { value: "2" } });
    expect(screen.getByRole("combobox", { name: "Warehouse" }).value).toBe("");
    expect(screen.queryByRole("option", { name: "W1 — Warehouse 1" })).toBeNull();
    await act(async () => second({ data: [warehouse(22, 2)] }));
    expect(screen.getByRole("option", { name: "W2 — Warehouse 2" })).toBeTruthy();
  });
  it("ignores a late lookup from an old channel and masks options when no channel is selected", async () => {
    let old;
    f.dropdown.mockImplementationOnce(() => new Promise(resolve => { old = resolve; })).mockResolvedValueOnce({ data: [warehouse(22, 2)] });
    mount();
    fireEvent.change(screen.getByRole("combobox", { name: "Channel" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Channel" }), { target: { value: "2" } });
    await screen.findByRole("option", { name: "W2 — Warehouse 2" });
    await act(async () => old({ data: [warehouse(11, 1)] }));
    expect(screen.queryByRole("option", { name: "W1 — Warehouse 1" })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Channel" }), { target: { value: "" } });
    expect(screen.queryByRole("option", { name: "W2 — Warehouse 2" })).toBeNull();
    expect(f.dropdown).toHaveBeenCalledTimes(2);
  });
});
