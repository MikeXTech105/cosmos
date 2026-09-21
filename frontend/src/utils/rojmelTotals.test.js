import { describe, expect, it } from "vitest";
import { sumRojmelMoney } from "./rojmelTotals";

describe("Rojmel table totals", () => {
  it("adds decimal amounts and negative balances accurately", () => {
    expect(sumRojmelMoney([{ amount: 0.1 }, { amount: "0.2" }, { amount: -0.05 }], "amount")).toBe(0.25);
  });
  it("excludes cancelled transactions only when requested", () => {
    const rows = [{ amount: 50, status: 1 }, { amount: 20, status: 2 }, { amount: 10, status: "Cancelled" }];
    expect(sumRojmelMoney(rows, "amount", { excludeCancelled: true })).toBe(50);
    expect(sumRojmelMoney(rows, "amount")).toBe(80);
  });
  it("handles empty and missing values", () => {
    expect(sumRojmelMoney([], "amount")).toBe(0);
    expect(sumRojmelMoney([{}, { amount: "bad" }, { amount: null }], "amount")).toBe(0);
  });
});
