import { describe, expect, it } from "vitest";
import { purchaseDocumentActions } from "./purchaseLifecycle";

describe("Purchase lifecycle actions", () => {
  it.each([1, 2, 3, 4, 5])("gates bill state %s against the API lifecycle", status => {
    const actions = purchaseDocumentActions({ status }, "bills");
    expect(actions.edit).toBe(status === 1);
    expect(actions.confirm).toBe(status === 1);
    expect(actions.cancel).toBe(status !== 5);
    expect(actions.return).toBe([2, 3, 4].includes(status));
  });
  it("protects receipt-owned draft lines and unknown states", () => {
    expect(purchaseDocumentActions({ status: 1, items: [{ inventoryOwner: 2 }] }, "bills").edit).toBe(false);
    expect(purchaseDocumentActions({ status: 99 }, "bills")).toEqual({ edit: false, confirm: false, cancel: false, return: false });
  });
  it.each([1, 2, 3, 4, 5])("only allows unconverted order state %s to edit/cancel", status => {
    const actions = purchaseDocumentActions({ status }, "orders");
    expect(actions.edit).toBe([1, 2].includes(status));
    expect(actions.cancel).toBe([1, 2].includes(status));
  });
  it("retains immutability of physical-return financial credits", () => {
    expect(purchaseDocumentActions({ physicalReceiptReturnId: "999" }, "returns").edit).toBe(false);
  });
});
