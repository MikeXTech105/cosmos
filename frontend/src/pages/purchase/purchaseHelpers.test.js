import { describe, expect, it } from "vitest";

import {
  buildListParams,
  buildPurchaseDocumentPayload,
  getPaymentModeLabel,
  getPaymentTypeLabel,
  getPurchaseStatusMeta,
  getPurchaseStatusOptions,
  PAYMENT_MODE,
  PAYMENT_TYPE,
  PURCHASE_DOCUMENT_STATUS,
  PURCHASE_ORDER_STATUS,
  PURCHASE_PAYMENT_STATUS,
  getPurchasePaymentStatusLabel,
} from "./purchaseHelpers";

const billConfig = { dateField: "billDate" };

describe("purchase enum contract", () => {
  it("keeps document and order lifecycles separate when deserializing persisted values", () => {
    expect(PURCHASE_DOCUMENT_STATUS).toEqual({
      DRAFT: 1,
      CONFIRMED: 2,
      PARTIALLY_PAID: 3,
      PAID: 4,
      CANCELLED: 5,
    });
    expect(PURCHASE_ORDER_STATUS).toEqual({
      DRAFT: 1,
      SENT: 2,
      PARTIALLY_CONVERTED: 3,
      CONVERTED: 4,
      CANCELLED: 5,
    });
    expect(getPurchaseStatusMeta(3, "document").label).toBe("Partially paid");
    expect(getPurchaseStatusMeta(3, "order").label).toBe("Partially converted");
    expect(getPurchaseStatusOptions("document")).not.toEqual(
      getPurchaseStatusOptions("order"),
    );
    expect(PURCHASE_PAYMENT_STATUS).toEqual({ UNPAID: 1, PARTIAL: 2, PAID: 3 });
    expect(
      Object.values(PURCHASE_PAYMENT_STATUS).map(getPurchasePaymentStatusLabel),
    ).toEqual(["Unpaid", "Partial", "Paid"]);
  });

  it("serializes each status filter exactly as its backend enum value", () => {
    for (const status of [
      ...Object.values(PURCHASE_DOCUMENT_STATUS),
      ...Object.values(PURCHASE_ORDER_STATUS),
    ]) {
      expect(
        buildListParams({
          filters: { Search: "", Status: String(status) },
          pageNumber: 1,
          pageSize: 10,
        }).Status,
      ).toBe(status);
    }
  });

  it("uses every backend payment mode for bill create and update payloads", () => {
    expect(PAYMENT_MODE).toEqual({ CASH: 1, BANK: 2, UPI: 3, CHEQUE: 4, CARD: 5 });
    expect(PAYMENT_TYPE).toBe(PAYMENT_MODE);

    for (const paymentType of Object.values(PAYMENT_TYPE)) {
      const payload = buildPurchaseDocumentPayload(
        {
          supplierId: "supplier-id",
          billDate: "2026-10-09",
          dueDate: "",
          paymentType,
          discountAmount: "0",
          roundOff: "0",
          paidAmount: "0",
          notes: "",
          items: [{ itemId: "1", quantity: "1", purchasePrice: "10" }],
        },
        billConfig,
      );

      expect(payload.paymentType).toBe(paymentType);
      expect(getPaymentTypeLabel(paymentType)).toBe(getPaymentModeLabel(paymentType));
    }
  });
});
