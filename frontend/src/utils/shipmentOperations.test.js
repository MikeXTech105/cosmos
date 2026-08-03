import { describe, expect, it } from "vitest";

import {
  getPackingReconciliation,
  isMixedPackageAllocation,
  validateReturnReceive,
  validateReturnReceiveLine,
} from "./shipmentOperations";

describe("shipment packing reconciliation", () => {
  const items = [
    { id: 1, plannedQuantity: 10 },
    { id: 2, plannedQuantity: 4 },
  ];

  it("subtracts committed and draft package allocations from planned", () => {
    const result = getPackingReconciliation(
      items,
      [{ items: [{ quantity: 3, shipmentItemId: 1 }] }],
      [
        { quantity: 2, shipmentItemId: 1 },
        { quantity: 1, shipmentItemId: 2 },
      ],
    );

    expect(result).toEqual([
      expect.objectContaining({
        allocated: 5,
        isOverAllocated: false,
        isUnderAllocated: true,
        remaining: 5,
      }),
      expect.objectContaining({
        allocated: 1,
        isOverAllocated: false,
        isUnderAllocated: true,
        remaining: 3,
      }),
    ]);
  });

  it("flags over-allocation so save can be blocked", () => {
    const [result] = getPackingReconciliation(
      items,
      [{ items: [{ quantity: 9, shipmentItemId: 1 }] }],
      [{ quantity: 2, shipmentItemId: 1 }],
    );

    expect(result.remaining).toBe(-1);
    expect(result.isOverAllocated).toBe(true);
  });

  it("does not flag binary floating-point residue as an allocation mismatch", () => {
    const [result] = getPackingReconciliation(
      [{ id: 1, plannedQuantity: 0.3 }],
      [{ items: [{ quantity: 0.1, shipmentItemId: 1 }] }],
      [{ quantity: 0.2, shipmentItemId: 1 }],
    );

    expect(result.remaining).toBe(0);
    expect(result.isOverAllocated).toBe(false);
    expect(result.isUnderAllocated).toBe(false);
  });

  it("forces mixed when positive quantities reference multiple items", () => {
    expect(
      isMixedPackageAllocation([
        { quantity: 1, shipmentItemId: 1 },
        { quantity: 2, shipmentItemId: 2 },
      ]),
    ).toBe(true);
    expect(
      isMixedPackageAllocation([
        { quantity: 1, shipmentItemId: 1 },
        { quantity: 0, shipmentItemId: 2 },
      ]),
    ).toBe(false);
  });
});

describe("return receive validation", () => {
  it("requires restockable + damaged + non-restockable to equal received back", () => {
    const result = validateReturnReceiveLine({
      damagedQuantity: 1,
      nonRestockableQuantity: 1,
      receivedBackQuantity: 5,
      restockableQuantity: 2,
      returnQuantity: 5,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/must equal/i);
  });

  it("blocks received-back quantity above the return quantity", () => {
    const result = validateReturnReceiveLine({
      damagedQuantity: 1,
      nonRestockableQuantity: 1,
      receivedBackQuantity: 6,
      restockableQuantity: 4,
      returnQuantity: 5,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/cannot exceed/i);
  });

  it("totals only the restockable quantity for confirmation", () => {
    const result = validateReturnReceive([
      {
        damagedQuantity: 1,
        nonRestockableQuantity: 1,
        receivedBackQuantity: 5,
        restockableQuantity: 3,
        returnQuantity: 5,
      },
      {
        damagedQuantity: 0,
        nonRestockableQuantity: 1,
        receivedBackQuantity: 3,
        restockableQuantity: 2,
        returnQuantity: 3,
      },
    ]);

    expect(result.isValid).toBe(true);
    expect(result.totalRestockable).toBe(5);
  });

  it("accepts decimal splits affected only by binary floating-point residue", () => {
    const result = validateReturnReceiveLine({
      damagedQuantity: 0.1,
      nonRestockableQuantity: 0,
      receivedBackQuantity: 0.3,
      restockableQuantity: 0.2,
      returnQuantity: 0.3,
    });

    expect(result.isValid).toBe(true);
  });
});
