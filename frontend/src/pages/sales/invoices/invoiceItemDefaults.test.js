import { describe, expect, it } from "vitest";

import { canApplyItemDetails, getInvoiceItemDefaults } from "./invoiceItemDefaults";

describe("sales invoice item defaults", () => {
  it("retains leading zeroes and accepts a valid zero GST rate", () => {
    expect(getInvoiceItemDefaults({ name: "Zero rated", salesPrice: "100", gstRate: 0, hsnCode: "001234" })).toMatchObject({
      itemName: "Zero rated",
      hasSalesPrice: true,
      salesPrice: 100,
      hasGstRate: true,
      gstRate: 0,
      hsnSacCode: "001234",
    });
  });

  it("does not turn omitted tax data into a zero-percent default", () => {
    const defaults = getInvoiceItemDefaults({ name: "Incomplete", salesPrice: 100 });

    expect(defaults.hasGstRate).toBe(false);
    expect(defaults.gstRate).toBeNull();
  });

  it("rejects a stale item-details response", () => {
    expect(canApplyItemDetails({ currentItemId: 2, requestItemId: 1, currentVersion: 2, requestVersion: 1 })).toBe(false);
    expect(canApplyItemDetails({ currentItemId: 2, requestItemId: 2, currentVersion: 2, requestVersion: 2 })).toBe(true);
  });
});
