// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ removePackage: vi.fn(), getSuggestions: vi.fn(), list: vi.fn() }));
vi.mock("../../../services/shipments", () => ({ shipmentPackingService: api }));
vi.mock("../../../services/supplyChain/packagingProfileService", () => ({ supplyChainPackagingProfileService: { list: api.list } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import ShipmentPackingTab from "./ShipmentPackingTab";
const shipment = { id: "9007199254740999", version: "0x0000000000000042", items: [], packages: [{ id: "9007199254740998", packageNumber: "BOX-1", items: [] }] };
beforeEach(() => { api.removePackage.mockReset(); api.getSuggestions.mockResolvedValue({ data: [] }); api.list.mockResolvedValue({ data: { items: [] } }); });
afterEach(cleanup);
describe("draft package recovery", () => {
  it("retains the reviewed version and command key across an uncertain retry", async () => {
    const onWritten = vi.fn().mockResolvedValue(true);
    api.removePackage.mockRejectedValueOnce(new Error("Network outcome unknown")).mockResolvedValueOnce({ data: shipment });
    render(<ShipmentPackingTab shipment={shipment} action={{ enabled: true }} onWritten={onWritten} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove / repack" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Remove draft package BOX-1" }));
    fireEvent.change(dialog.getByLabelText(/Reason for removal/), { target: { value: "Wrong conversion" } });
    fireEvent.click(dialog.getByRole("button", { name: "Confirm removal" }));
    await dialog.findByRole("button", { name: "Retry same removal" });
    expect(dialog.getByLabelText(/Reason for removal/).disabled).toBe(true);
    fireEvent.click(dialog.getByRole("button", { name: "Retry same removal" }));
    await waitFor(() => expect(onWritten).toHaveBeenCalledOnce());
    expect(api.removePackage).toHaveBeenCalledTimes(2);
    expect(api.removePackage.mock.calls[0]).toEqual(api.removePackage.mock.calls[1]);
    expect(api.removePackage.mock.calls[0].slice(0, 2)).toEqual([shipment.id, shipment.packages[0].id]);
    expect(api.removePackage.mock.calls[0][2]).toMatchObject({ version: shipment.version, reason: "Wrong conversion" });
  });
  it("does not offer an active removal when permission or current version is unavailable", () => {
    const rendered = render(<ShipmentPackingTab shipment={shipment} action={{ enabled: false, reason: "Packing edit permission required" }} onWritten={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Remove / repack" })).toBeNull();
    rendered.unmount();
    render(<ShipmentPackingTab shipment={{ ...shipment, version: null }} action={{ enabled: true }} onWritten={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Remove / repack" }).disabled).toBe(true);
  });
});
