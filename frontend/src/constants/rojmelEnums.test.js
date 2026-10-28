import { describe, expect, it } from "vitest";

import {
  getTransactionTypeLabel,
  getTransactionTypeTone,
  RojmelTransactionType,
  getTransactionStatusLabel,
  getWalletTypeLabel,
} from "./rojmelEnums";
import { ROJMEL_TRANSACTION_TYPE_OPTIONS as TRANSACTION_TYPE_OPTIONS, ROJMEL_WALLET_TYPE_OPTIONS as WALLET_TYPE_OPTIONS, ROJMEL_STATUS_OPTIONS as TRANSACTION_STATUS_OPTIONS } from "../pages/rojmel/rojmelHelpers";

describe("rojmel enum helpers", () => {
  it("renders persisted backend transaction identities without relabeling history", () => {
    expect([5, 6, 7].map(getTransactionTypeLabel)).toEqual(["Opening Balance", "Adjustment In", "Adjustment Out"]);
    expect([4, 5].map(getWalletTypeLabel)).toEqual(["Petty Cash", "Bank Cash"]);
    expect(getTransactionStatusLabel(1)).toBe("Posted");
    expect(TRANSACTION_TYPE_OPTIONS).toEqual(expect.arrayContaining([{ label: "Opening Balance", value: 5 }, { label: "Adjustment In", value: 6 }, { label: "Adjustment Out", value: 7 }]));
    expect(WALLET_TYPE_OPTIONS).toEqual(expect.arrayContaining([{ label: "Petty Cash", value: 4 }, { label: "Bank Cash", value: 5 }]));
    expect(TRANSACTION_STATUS_OPTIONS).toEqual(expect.arrayContaining([{ label: "Posted", value: 1 }]));
  });
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
