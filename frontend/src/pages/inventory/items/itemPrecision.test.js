import { describe, expect, it } from "vitest";
import { completeItemDecimal, itemDecimalSchema } from "./itemPrecision";
import { getItemDefaultValues, buildItemPayload } from "./itemHelpers";
import { itemSchema } from "../../../utils/validationSchemas";

describe("Item stock precision", () => {
  it("retains exact 22,6 quantity digits through blur, schema and payload", () => {
    const quantity = "9999999999999999.123456";
    expect(completeItemDecimal(quantity)).toBe(quantity);
    const input = { ...getItemDefaultValues(), name: "Precision fixture", itemCode: "EXACT", categoryId: "1", unitId: "1", openingStock: quantity, minimumStock: "0.000001" };
    const parsed = itemSchema.parse(input);
    expect(buildItemPayload(parsed).openingStock).toBe(quantity);
    expect(buildItemPayload(parsed).minimumStock).toBe("0.000001");
  });
  it("rejects unsupported quantity scale and range instead of rounding", () => {
    expect(itemDecimalSchema("Stock").safeParse("1.0000001").success).toBe(false);
    expect(itemDecimalSchema("Stock").safeParse("10000000000000000").success).toBe(false);
    expect(itemDecimalSchema("Stock").safeParse("-0.000001").success).toBe(false);
    expect(itemDecimalSchema("Value", 2).safeParse("1.001").success).toBe(false);
    expect(completeItemDecimal("1234567890123456.1200")).toBe("1234567890123456.1200");
  });
});
