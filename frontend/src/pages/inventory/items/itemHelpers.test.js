import { describe, expect, it } from "vitest";

import { buildItemPayload, ITEM_TYPE } from "./itemHelpers";

const itemValues = (overrides = {}) => ({
  barcode: "",
  categoryId: 1,
  description: "",
  gstRate: 0,
  hsnCode: "",
  imageFile: null,
  imageUrl: "",
  isActive: true,
  isManufactured: true,
  itemCode: "FG-1",
  itemType: ITEM_TYPE.PRODUCT,
  minimumStock: 0,
  name: "Finished good",
  openingStock: 0,
  openingStockValue: 0,
  procurementClassification: "",
  purchasePrice: 0,
  reservedStock: 0,
  salesPrice: 0,
  trackInventory: true,
  unitId: 1,
  ...overrides,
});

describe("item manufacturing payload", () => {
  it("only marks active, inventory-tracked products as manufactured", () => {
    expect(buildItemPayload(itemValues()).isManufactured).toBe(true);
    expect(buildItemPayload(itemValues({ isActive: false })).isManufactured).toBe(false);
    expect(buildItemPayload(itemValues({ trackInventory: false })).isManufactured).toBe(false);
    expect(buildItemPayload(itemValues({ itemType: ITEM_TYPE.SERVICE })).isManufactured).toBe(false);
  });

  it("keeps an HSN code as trimmed text so leading zeroes reach the item API", () => {
    const payload = buildItemPayload(itemValues({ hsnCode: " 001234 " }));

    expect(payload.hsnCode).toBe("001234");
    expect(payload.gstRate).toBe(0);
  });
});
