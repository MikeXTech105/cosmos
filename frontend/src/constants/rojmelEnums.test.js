import { describe, expect, it } from "vitest";

import {
  getTransactionTypeLabel,
  getTransactionTypeTone,
  RojmelTransactionType,
} from "./rojmelEnums";

describe("rojmel enum helpers", () => {
  it("keeps transfers financially neutral", () => {
    expect(getTransactionTypeTone(RojmelTransactionType.TransferIn)).toBe(
      "transfer",
    );
    expect(getTransactionTypeTone(RojmelTransactionType.TransferOut)).toBe(
      "transfer",
    );
  });

  it("labels known and unknown values safely", () => {
    expect(getTransactionTypeLabel(RojmelTransactionType.Income)).toBe(
      "Income",
    );
    expect(getTransactionTypeLabel(999)).toBe("Unknown");
  });
});
