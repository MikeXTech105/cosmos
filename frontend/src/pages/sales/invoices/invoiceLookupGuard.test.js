import { describe, expect, it } from "vitest";
import { invoiceLookupTarget } from "./invoiceLookupGuard";

describe("Invoice asynchronous lookup ownership", () => {
  it("discards an old Item response and an old invoice-date response", async () => {
    let itemId = "9007199254740993", date = "2026-10-28", hsn = "original";
    const getValues = path => path === "invoiceDate" ? date : itemId;
    const request = { rows: [{ id: "stable-row" }], rowId: "stable-row", itemId, invoiceDate: date, getValues, latest: true };
    let finish;
    const pending = new Promise(resolve => { finish = resolve; }).then(() => { if (invoiceLookupTarget(request) >= 0) hsn = "stale classification"; });
    itemId = "22";
    finish(); await pending;
    expect(hsn).toBe("original");
    itemId = request.itemId; date = "2026-10-29";
    expect(invoiceLookupTarget(request)).toBe(-1);
  });
  it("finds the original row after reordering and rejects a removed or superseded row", () => {
    const values = { invoiceDate: "2026-10-28", "items.0.itemId": "22", "items.1.itemId": "11" };
    const request = { rows: [{ id: "b" }, { id: "a" }], rowId: "a", itemId: "11", invoiceDate: "2026-10-28", getValues: path => values[path], latest: true };
    expect(invoiceLookupTarget(request)).toBe(1);
    expect(invoiceLookupTarget({ ...request, rows: [{ id: "b" }] })).toBe(-1);
    expect(invoiceLookupTarget({ ...request, latest: false })).toBe(-1);
  });
});
