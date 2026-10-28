import { describe, expect, it } from "vitest";
import { formatCurrency, formatQty } from "./reportFormat";

describe("exact report values", () => {
  it("shows source quantity precision without rounding away a posting difference", () => {
    expect(formatQty("24.123456")).toBe("24.123456");
    expect(formatQty("0.000001")).toBe("0.000001");
    expect(formatQty("-0.000001")).toBe("-0.000001");
    expect(formatQty("9999999999999999.123456")).toBe("9,99,99,99,99,99,99,999.123456");
    expect(formatQty(null)).toBe("-");
  });
  it("formats large currency strings exactly and retains existing two-decimal display rounding", () => {
    expect(formatCurrency("9999999999999999.99")).toBe("₹9,99,99,99,99,99,99,999.99");
    expect(formatCurrency("-12.345")).toBe("-₹12.35");
    expect(formatCurrency("0")).toBe("₹0.00");
  });
});
