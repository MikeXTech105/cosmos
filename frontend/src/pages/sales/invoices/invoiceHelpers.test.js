import { describe, expect, it } from "vitest";

import {
  buildInvoicePayload,
  buildInvoiceQueryParams,
  getInvoiceDefaultValues,
  getInvoiceTotals,
  getInvoiceStatusMeta,
  getPaymentModeLabel,
  getPaymentStatusMeta,
  isInvoiceCancelled,
  isInvoiceConfirmed,
  isInvoiceDraft,
  SALES_INVOICE_STATUS,
  SALES_PAYMENT_MODE,
  SALES_PAYMENT_STATUS,
} from "./invoiceHelpers";

describe("sales invoice enum contract", () => {
  it("deserializes every persisted invoice and payment status consistently", () => {
    expect(SALES_INVOICE_STATUS).toEqual({
      DRAFT: 1,
      CONFIRMED: 2,
      PARTIALLY_PAID: 3,
      PAID: 4,
      CANCELLED: 5,
    });
    expect(SALES_PAYMENT_STATUS).toEqual({
      UNPAID: 1,
      PARTIALLY_PAID: 2,
      PAID: 3,
    });

    expect(
      [1, 2, 3, 4, 5].map((status) => getInvoiceStatusMeta(status).label),
    ).toEqual(["Draft", "Confirmed", "Partially paid", "Paid", "Cancelled"]);
    expect(
      [1, 2, 3].map((status) => getPaymentStatusMeta(status).label),
    ).toEqual(["Unpaid", "Partially paid", "Paid"]);
  });

  it("serializes the selected status filters without changing their values", () => {
    for (const status of Object.values(SALES_INVOICE_STATUS)) {
      expect(
        buildInvoiceQueryParams({
          filters: { Status: String(status), PaymentStatus: "all" },
          pageNumber: 1,
          pageSize: 10,
        }).Status,
      ).toBe(status);
    }

    for (const paymentStatus of Object.values(SALES_PAYMENT_STATUS)) {
      expect(
        buildInvoiceQueryParams({
          filters: { Status: "all", PaymentStatus: String(paymentStatus) },
          pageNumber: 1,
          pageSize: 10,
        }).PaymentStatus,
      ).toBe(paymentStatus);
    }
  });

  it("serializes every backend payment mode in an initial-payment payload", () => {
    expect(SALES_PAYMENT_MODE).toEqual({
      CASH: 1,
      BANK_TRANSFER: 2,
      CARD: 3,
      UPI: 4,
      CHEQUE: 5,
      OTHER: 99,
    });

    for (const paymentMode of Object.values(SALES_PAYMENT_MODE)) {
      const payload = buildInvoicePayload({
        customerPartyId: "customer-id",
        invoiceDate: "2026-10-09",
        dueDate: "",
        discountAmount: "0",
        notes: "",
        termsAndConditions: "",
        items: [{ itemId: "1", quantity: "1", rate: "100" }],
        initialPayment: { amount: "25", paymentMode },
      });

      expect(payload.initialPayment.paymentMode).toBe(paymentMode);
      expect(getPaymentModeLabel(paymentMode)).not.toMatch(/^Mode /);
    }
  });

  it("keeps the known action gates tied to their persisted statuses", () => {
    expect(isInvoiceDraft({ status: SALES_INVOICE_STATUS.DRAFT })).toBe(true);
    expect(isInvoiceConfirmed({ status: SALES_INVOICE_STATUS.CONFIRMED })).toBe(true);
    expect(isInvoiceCancelled({ status: SALES_INVOICE_STATUS.CANCELLED })).toBe(true);
    expect(isInvoiceCancelled({ status: SALES_INVOICE_STATUS.PAID })).toBe(false);
  });

  it("keeps the saved HSN/SAC snapshot when a draft is reopened", () => {
    const values = getInvoiceDefaultValues({
      items: [{
        itemId: 41,
        itemNameSnapshot: "Mapped item",
        hsnSacCodeSnapshot: "847130",
        quantity: 1,
        rate: 100,
      }],
    });

    expect(values.items[0]).toMatchObject({
      itemId: 41,
      itemName: "Mapped item",
      hsnSacCode: "847130",
    });
  });

  it("serializes the backend taxPercentage field and calculates a tax-exclusive 18% line", () => {
    const values = {
      customerPartyId: "customer-id",
      invoiceDate: "2026-10-28",
      dueDate: null,
      discountAmount: 0,
      items: [{ itemId: 41, quantity: 2, rate: 100, discountPercentage: 0, discountAmount: 0, taxPercentage: 18 }],
    };

    expect(getInvoiceTotals(values.items, 0)).toMatchObject({
      subTotal: 200,
      taxAmount: 36,
      grandTotal: 236,
    });
    expect(buildInvoicePayload(values).items[0]).toMatchObject({
      itemId: 41,
      rate: 100,
      taxPercentage: 18,
    });
  });
});
