import { describe, expect, it } from "vitest";
import { stringify } from "lossless-json";
import { financialIdSchema, financialMoneySchema, wireFinancialEntry } from "./financialEntry";

describe("supplier payment and expense transport", () => {
  it("keeps long bill/category IDs and exact paise as JSON numbers without binary conversion", () => {
    const payload = { categoryId: "9223372036854775806", amount: "9999999999999999.99", allocations: [{ purchaseBillId: "9007199254740993", allocatedAmount: "0.01" }] };
    expect(stringify(wireFinancialEntry(payload))).toBe('{"categoryId":9223372036854775806,"amount":9999999999999999.99,"allocations":[{"purchaseBillId":9007199254740993,"allocatedAmount":0.01}]}');
    expect(financialIdSchema.parse("9223372036854775806")).toBe("9223372036854775806");
    expect(financialMoneySchema(true).parse("9999999999999999.99")).toBe("9999999999999999.99");
  });
  it("rejects unsafe numeric identities, negative allocations and unsupported fractional money", () => {
    expect(financialIdSchema.safeParse(9007199254740992).success).toBe(false);
    expect(financialMoneySchema().safeParse("-0.01").success).toBe(false);
    expect(financialMoneySchema().safeParse("0.001").success).toBe(false);
  });
});
