// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

const api = vi.hoisted(() => ({ capacity: vi.fn(), schedule: vi.fn(), bom: vi.fn(), release: vi.fn() }));
const earlyInput = vi.hoisted(() => ({ afterUnlock: false }));
vi.mock("../../../services/manufacturing/productionOrderService", () => ({ default: api }));
vi.mock("../../../hooks/useCapabilities", () => ({ default: () => ({ canView: true, canApprove: true }) }));
vi.mock("./orderHooks", async (original) => ({ ...(await original()), useItemLabels: () => (id) => `Item ${id}` }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("../../../components/common/AppInput", async (original) => {
  const { default: AppInput } = await original();
  const { useLayoutEffect, useRef } = await import("react");
  return { default: function InputWithEarlyAutofill(props) {
    const { disabled, label, onChange } = props;
    const wasDisabled = useRef(disabled);
    useLayoutEffect(() => {
      // Browser autofill/fast input can occur as soon as recovery unlocks, before passive effects.
      if (earlyInput.afterUnlock && label === "Step 1 booking start with offset" && wasDisabled.current && !disabled) {
        earlyInput.afterUnlock = false;
        onChange({ target: { value: "2026-10-27T10:00:00+05:30" } });
      }
      wasDisabled.current = disabled;
    }, [disabled, label, onChange]);
    return <AppInput {...props} />;
  } };
});
import OrderCapacity from "./OrderCapacity";
import OrderCommandModal from "./OrderCommandModal";

const order = { id: 7, status: 2, version: "0x0000000000000010", plannedStart: "2026-10-27", dueDate: "2026-10-28", businessDate: "2026-10-27", plannedQuantity: "3", releasedQuantity: "3", completedQuantity: "0", rejectedQuantity: "0", remainingQuantity: "3", itemId: 4, unitId: 3, bomId: 9 };
const capacity = { orderId: 7, version: order.version, timeZone: "India Standard Time", lines: [{ routingStepId: 11, sequence: 1, workCentreId: 5, shiftId: 6, requiredMinutes: "15", availableMinutes: "180", capacityFactor: "0.5", minimumBookingSeconds: "1800", windowFrom: "2026-10-27T09:00:00+05:30", windowTo: "2026-10-27T17:00:00+05:30" }] };
const enterBooking = (from = "2026-10-27T09:00:00+05:30", to = "2026-10-27T10:00:00+05:30") => {
  fireEvent.change(screen.getByLabelText("Step 1 booking start with offset"), { target: { value: from } });
  fireEvent.change(screen.getByLabelText("Step 1 booking end with offset"), { target: { value: to } });
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  earlyInput.afterUnlock = false;
  api.capacity.mockResolvedValue({ data: capacity });
  api.bom.mockResolvedValue({ data: { id: 9, components: [] } });
});

describe("real order command recovery", () => {
  it("keeps a successful booking successful when parent readback returns a new order version", async () => {
    api.schedule.mockResolvedValue({ data: { id: 7, version: "0x0000000000000011", status: "Scheduled" } });
    api.capacity.mockResolvedValueOnce({ data: capacity }).mockResolvedValue({ data: { ...capacity, version: "0x0000000000000011" } });
    function Parent() {
      const [current, setCurrent] = useState(order);
      return <OrderCapacity order={current} canApprove onScheduled={async () => { const next = { ...current, version: "0x0000000000000011" }; setCurrent(next); return { order: next }; }} onConflict={async () => ({ order: current })} />;
    }
    render(<Parent />);
    await screen.findByLabelText("Step 1 booking start with offset");
    enterBooking();
    fireEvent.click(screen.getByRole("button", { name: "Approve ordered booking" }));
    await waitFor(() => expect(api.capacity.mock.calls.length).toBeGreaterThan(1));
    await waitFor(() => expect(screen.getByLabelText("Capacity business date").disabled).toBe(false));
    expect(screen.queryByText(/The booking completed, but refreshing its context failed/)).toBeNull();
  });

  it("locks duplicate booking submissions before the first response arrives", async () => {
    let finish;
    api.schedule.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<OrderCapacity order={order} canApprove onScheduled={async () => ({ order })} onConflict={async () => ({ order })} />);
    await screen.findByLabelText("Step 1 booking start with offset");
    enterBooking();
    const button = screen.getByRole("button", { name: "Approve ordered booking" });
    const form = button.closest("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.schedule).toHaveBeenCalledOnce();
    finish({ data: { id: 7, status: "Scheduled" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve ordered booking" }).disabled).toBe(false));
  });

  it("retains booking retry identity and cannot unlock an unknown/committed result through a date change or failed reload", async () => {
    api.schedule.mockRejectedValueOnce(new Error("Network outcome unknown")).mockResolvedValue({ data: { id: 7, version: "0x0000000000000011", status: "Scheduled" } });
    const onScheduled = vi.fn().mockResolvedValue(null), onConflict = vi.fn().mockResolvedValue(null);
    render(<OrderCapacity order={order} canApprove onScheduled={onScheduled} onConflict={onConflict} />);
    await screen.findByLabelText("Step 1 booking start with offset");
    enterBooking();
    fireEvent.click(screen.getByRole("button", { name: "Approve ordered booking" }));
    await screen.findByRole("button", { name: "Reload and review saved booking" });
    expect(api.schedule).toHaveBeenCalledOnce();
    const key = api.schedule.mock.calls[0][1].idempotencyKey;
    expect(screen.getByLabelText("Capacity business date").disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Read capacity" }));
    expect(api.capacity).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Approve ordered booking" }));
    await screen.findByText(/The booking completed, but refreshing/);
    expect(api.schedule).toHaveBeenCalledTimes(2);
    expect(api.schedule.mock.calls[1][1].idempotencyKey).toBe(key);
    fireEvent.submit(screen.getByRole("button", { name: "Approve ordered booking" }).closest("form"));
    expect(api.schedule).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Reload and review saved booking" }));
    await screen.findByText(/The order could not be reloaded/);
    expect(screen.getByRole("button", { name: "Approve ordered booking" }).disabled).toBe(true);
    onConflict.mockResolvedValue({ order });
    earlyInput.afterUnlock = true;
    fireEvent.click(screen.getByRole("button", { name: "Reload and review saved booking" }));
    await waitFor(() => expect(screen.getByLabelText("Capacity business date").disabled).toBe(false));
    expect(screen.getByLabelText("Step 1 booking start with offset").value).toBe("2026-10-27T10:00:00+05:30");
    expect(screen.getByLabelText("Step 1 booking end with offset").value).toBe("");
    fireEvent.change(screen.getByLabelText("Step 1 booking end with offset"), { target: { value: "2026-10-27T11:00:00+05:30" } });
    onScheduled.mockResolvedValue({ order });
    fireEvent.click(screen.getByRole("button", { name: "Approve ordered booking" }));
    await waitFor(() => expect(api.schedule).toHaveBeenCalledTimes(3));
    expect(api.schedule.mock.calls[2][1].idempotencyKey).not.toBe(key);
    expect(api.schedule.mock.calls[2][1].bookings).toEqual([{ routingStepId: 11, from: "2026-10-27T10:00:00+05:30", to: "2026-10-27T11:00:00+05:30" }]);
  });

  it("keeps a committed release modal locked and visible when readback fails, until a real authoritative read succeeds", async () => {
    api.release.mockResolvedValue({ data: { id: 7, version: "0x0000000000000011", status: "Released" } });
    const onSaved = vi.fn().mockResolvedValue(false), onConflict = vi.fn().mockResolvedValue(null), onClose = vi.fn();
    render(<OrderCommandModal action="release" context={{ order: { ...order, status: 1 }, materials: [] }} onSaved={onSaved} onConflict={onConflict} onClose={onClose} />);
    await waitFor(() => expect(api.bom).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Approve release" }));
    await screen.findByText(/The command completed, but refreshing its order context failed/);
    expect(api.release).toHaveBeenCalledOnce();
    fireEvent.submit(screen.getByRole("button", { name: "Approve release" }).closest("form"));
    expect(api.release).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Reload and review outcome" }));
    await screen.findByText(/Authoritative order context could not be reloaded/);
    expect(onClose).not.toHaveBeenCalled();
    onConflict.mockResolvedValue({ order: { ...order, status: 2 } });
    fireEvent.click(screen.getByRole("button", { name: "Reload and review outcome" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(api.release).toHaveBeenCalledOnce();
  });

  it("never silently rebases entered release quantities onto a new order version", async () => {
    const onClose = vi.fn(), current = { ...order, status: 1 };
    const props = { action: "release", context: { order: current, materials: [] }, onSaved: vi.fn(), onConflict: async () => ({ order: { ...current, version: "0x0000000000000020" } }), onClose };
    const { rerender } = render(<OrderCommandModal {...props} />);
    await waitFor(() => expect(api.bom).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByLabelText(/Approved release quantity/), { target: { value: "2" } });
    rerender(<OrderCommandModal {...props} context={{ order: { ...current, version: "0x0000000000000020", plannedQuantity: "8" }, materials: [] }} />);
    expect(screen.getByLabelText(/Approved release quantity/).value).toBe("2");
    const submit = screen.getByRole("button", { name: "Approve release" });
    expect(submit.disabled).toBe(true);
    fireEvent.submit(submit.closest("form"));
    expect(api.release).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload and review outcome" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
