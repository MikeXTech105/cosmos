import { describe, expect, it } from "vitest";
import { returnSourceLines, returnDiscount } from "./purchaseReturnSource";
import { purchaseDocumentSchema } from "./purchaseDocumentSchema";

describe("Original purchase bill return", () => {
  const line = { id: "9007199254740997", itemId: "9007199254740993", unitId: "9007199254740995", itemName: "Original Item", quantity: "10", remainingReturnableQuantity: "3.000001", purchasePrice: "20", taxPercentage: "18", discountAmount: "10", inventoryOwner: 1 };
  it("retains exact original identities, units and only the remaining bill-owned quantities", () => {
    const lines = returnSourceLines({ status: 2, items: [line, { ...line, id: "2", inventoryOwner: 2 }, { ...line, id: "3", remainingReturnableQuantity: "0" }] });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ itemId: "9007199254740993", unitId: "9007199254740995", purchaseBillItemId: "9007199254740997", quantity: "3.000001", maxReturnQuantity: "3.000001", discountAmount: "3.00" });
  });
  it("blocks unconfirmed sources and an excessive correction quantity", () => {
    expect(() => returnSourceLines({ status: 1, items: [line] })).toThrow("confirmed");
    const form = { supplierId: "b818489c-e263-46a6-83a3-88f472e00bd0", returnDate: "2026-10-28", discountAmount: 0, roundOff: 0, paidAmount: 0, items: [{ ...returnSourceLines({ status: 2, items: [line] })[0], quantity: "3.000002" }] };
    const result = purchaseDocumentSchema("returnDate").safeParse(form);
    expect(result.success).toBe(false);
    expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ["items", 0, "quantity"] })]));
  });
  it("prorates a fixed source discount to the requested return quantity under existing paise rounding", () => {
    expect(returnDiscount("10", "10", "2")).toBe("2.00");
    expect(returnDiscount("1", "3", "1")).toBe("0.33");
  });
});
