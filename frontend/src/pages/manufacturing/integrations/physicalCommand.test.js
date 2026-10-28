import { describe, expect, it, vi } from "vitest";

import { createCommandIntent, reloadPhysical, reviewPhysical } from "./physicalHooks";

describe("physical command intent retries", () => {
  it("retains exact intent on uncertain retry, changes keys for edited payload/action and after known completion", () => {
    const intent = createCommandIntent();
    const source = { version: "0x0000000000000010", lines: [{ shipmentItemId: 2, invoiceLineId: 3, quantity: "0.000001" }] };
    const first = intent.payload("shipment-links:1", source);
    expect(intent.matches("shipment-links:1", structuredClone(source))).toBe(true);
    expect(intent.payload("shipment-links:1", structuredClone(source))).toBe(first);
    const edited = intent.payload("shipment-links:1", { ...source, lines: [{ ...source.lines[0], quantity: "0.000002" }] });
    expect(edited.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(intent.matches("shipment-links:1", source)).toBe(false);
    expect(intent.payload("purchase-return:1", source).idempotencyKey).not.toBe(edited.idempotencyKey);
    const completed = intent.payload("shipment-links:1", source);
    intent.complete();
    expect(intent.payload("shipment-links:1", source).idempotencyKey).not.toBe(completed.idempotencyKey);
  });
  it("never clears an uncertain/stale command when any authoritative read failed", async () => {
    const command = { clear: vi.fn() };
    await reviewPhysical(command, async () => true, async () => false);
    expect(command.clear).not.toHaveBeenCalled();
    await expect(reloadPhysical(async () => false)).rejects.toThrow(/could not be reloaded/);
    await reviewPhysical(command, async () => true, async () => true);
    expect(command.clear).toHaveBeenCalledWith(true);
    command.clear.mockClear();
    expect(await reviewPhysical(command, async () => undefined)).toBe(false);
    expect(command.clear).not.toHaveBeenCalled();
    await expect(reloadPhysical(async () => undefined)).rejects.toThrow(/could not be reloaded/);
  });
});
