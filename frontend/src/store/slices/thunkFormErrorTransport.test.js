import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyApiErrorsToForm } from "../../utils/formApiErrors";
import { getApiCorrelationId, getApiStatus, isConflictError, isTimeoutError } from "../../utils/apiError";

const services = vi.hoisted(() => ({
  item: { createItem: vi.fn(), updateItem: vi.fn(), getItems: vi.fn() },
  invoice: { createInvoice: vi.fn(), updateInvoice: vi.fn(), getInvoices: vi.fn() },
  bill: { createPurchaseBill: vi.fn(), updatePurchaseBill: vi.fn() },
  order: { createPurchaseOrder: vi.fn(), updatePurchaseOrder: vi.fn() },
  payment: { createSupplierPayment: vi.fn(), updateSupplierPayment: vi.fn() },
  expense: { createExpense: vi.fn(), updateExpense: vi.fn(), getExpenses: vi.fn() },
  returns: { createPurchaseReturn: vi.fn(), updatePurchaseReturn: vi.fn() },
}));
vi.mock("../../services/inventory/itemService", () => ({ itemService: services.item }));
vi.mock("../../services/sales/invoiceService", () => ({ invoiceService: services.invoice }));
vi.mock("../../services/purchase/purchaseBillService", () => ({ purchaseBillService: services.bill }));
vi.mock("../../services/purchase/purchaseOrderService", () => ({ purchaseOrderService: services.order }));
vi.mock("../../services/purchase/supplierPaymentService", () => ({ supplierPaymentService: services.payment }));
vi.mock("../../services/purchase/expenseService", () => ({ expenseService: services.expense }));
vi.mock("../../services/purchase/purchaseReturnService", () => ({ purchaseReturnService: services.returns }));
import itemReducer, { createItem, updateItem, fetchItems } from "./inventory/itemSlice";
import invoiceReducer, { createInvoice, updateInvoice, fetchInvoices } from "./sales/invoiceSlice";
import billReducer, { createPurchaseBill, updatePurchaseBill } from "./purchase/purchaseBillSlice";
import orderReducer, { createPurchaseOrder, updatePurchaseOrder } from "./purchase/purchaseOrderSlice";
import paymentReducer, { createSupplierPayment, updateSupplierPayment } from "./purchase/supplierPaymentSlice";
import expenseReducer, { createExpense, updateExpense, fetchExpenses } from "./purchase/expenseSlice";
import returnReducer, { createPurchaseReturn, updatePurchaseReturn } from "./purchase/purchaseReturnSlice";

const resources = [
  ["Item", itemReducer, services.item, createItem, updateItem, "Name", "name"],
  ["Invoice", invoiceReducer, services.invoice, createInvoice, updateInvoice, "Request.Items[2].Quantity", "items.2.quantity"],
  ["Bill", billReducer, services.bill, createPurchaseBill, updatePurchaseBill, "Request.Items[2].Quantity", "items.2.quantity"],
  ["Order", orderReducer, services.order, createPurchaseOrder, updatePurchaseOrder, "Request.Items[2].Quantity", "items.2.quantity"],
  ["Payment", paymentReducer, services.payment, createSupplierPayment, updateSupplierPayment, "Request.Amount", "amount"],
  ["Expense", expenseReducer, services.expense, createExpense, updateExpense, "Request.Amount", "amount"],
  ["Return", returnReducer, services.returns, createPurchaseReturn, updatePurchaseReturn, "Request.Items[2].Quantity", "items.2.quantity"],
];
const validation = field => ({
  message: "Request failed with status code 400", code: "ERR_BAD_REQUEST",
  config: { headers: { Authorization: "Bearer SECRET_AUTH_TOKEN" }, data: "SECRET_REQUEST_BODY" },
  request: { private: "SECRET_RAW_REQUEST" },
  response: { status: 400, headers: { "set-cookie": "SECRET_COOKIE" }, data: { message: "Validation failed", correlationId: "trace-400", errors: { [field]: ["Exceeds the remaining reviewed quantity."] }, internal: "SECRET_SERVER_DATA" } },
});
const storeFor = reducer => configureStore({ reducer: { resource: reducer } });
async function dispatchRejected(store, thunk, argument = {}) {
  const pending = store.dispatch(thunk(argument));
  const rejected = pending.unwrap().catch(error => error);
  const action = await pending;
  const payload = await rejected;
  expect(action.meta.rejectedWithValue).toBe(true);
  expect(payload).toBe(action.payload);
  return payload;
}
beforeEach(() => vi.resetAllMocks());

describe.each(resources)("%s actual Redux form error transport", (name, reducer, service, create, update, serverField, formField) => {
  it.each([["create", create, false], ["update", update, true]])("retains400 metadata through %s thunk unwrap and binds the real form path", async (operation, thunk, updating) => {
    const method = Object.keys(service).find(key => key.startsWith(updating ? "update" : "create"));
    service[method].mockRejectedValue(validation(serverField));
    const store = storeFor(reducer);
    const payload = await dispatchRejected(store, thunk, updating ? { id: "9007199254740993", payload: { amount: "10.00" } } : { amount: "10.00" });
    expect(payload.status).toBe(400); expect(payload.response.status).toBe(400);
    expect(getApiStatus(payload)).toBe(400); expect(getApiCorrelationId(payload)).toBe("trace-400");
    const setError = vi.fn();
    const mapped = applyApiErrorsToForm({ error: payload, formFieldNames: [formField], setError });
    expect(mapped).toMatchObject({ status: 400, wasValidation: true, wasConflict: false, boundFields: [formField] });
    expect(setError).toHaveBeenCalledWith(formField, { message: "Exceeds the remaining reviewed quantity.", type: "server" }, { shouldFocus: true });
    expect(typeof store.getState().resource.error).toBe("string");
    expect(store.getState().resource.error).toContain("remaining reviewed quantity");
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/SECRET_|Authorization|set-cookie|"config"|"headers"|"request"/);
    expect(JSON.parse(serialized)).toEqual(payload);
  });
});

describe("definite rejection versus unknown save outcome", () => {
  it("preserves409 conflict field/code without turning it into an uncertain network save", async () => {
    services.invoice.updateInvoice.mockRejectedValue({ response: { status: 409, data: { message: "Invoice number already exists.", field: "InvoiceNumber", data: { conflictCode: "DUPLICATE_REFERENCE" }, correlationId: "trace-409" } } });
    const store = storeFor(invoiceReducer);
    const error = await dispatchRejected(store, updateInvoice, { id: "4", payload: {} });
    expect(isConflictError(error)).toBe(true); expect(error.response.status).toBeLessThan(500);
    expect(error.apiError.conflictCode).toBe("DUPLICATE_REFERENCE");
    const setError = vi.fn(); const mapped = applyApiErrorsToForm({ error, formFieldNames: ["invoiceNumber"], setError });
    expect(mapped.boundFields).toEqual(["invoiceNumber"]); expect(mapped.wasConflict).toBe(true);
    expect(setError).toHaveBeenCalledWith("root.server", expect.objectContaining({ message: "Invoice number already exists." }));
  });
  it.each([
    ["HTTP503", { response: { status: 503, data: { message: "Service unavailable.", correlationId: "trace-503" } } }, 503],
    ["network", { code: "ERR_NETWORK", message: "Network Error", config: { headers: { Authorization: "SECRET_AUTH_TOKEN" } } }, null],
    ["timeout", { code: "ECONNABORTED", message: "timeout of1000ms exceeded" }, null],
  ])("keeps %s distinguishable for the consumer's unknown-outcome guard", async (_, failure, status) => {
    services.expense.createExpense.mockRejectedValue(failure);
    const store = storeFor(expenseReducer); const error = await dispatchRejected(store, createExpense);
    expect(error.status).toBe(status);
    expect(!error.response || error.response.status >= 500).toBe(true);
    expect(error.code).toBe(failure.code ?? null);
    const mapped = applyApiErrorsToForm({ error, formFieldNames: ["amount"], setError: vi.fn() });
    expect(mapped.wasValidation).toBe(false); expect(mapped.boundFields).toEqual([]);
    expect(typeof store.getState().resource.error).toBe("string");
    if (failure.code === "ECONNABORTED") expect(isTimeoutError(error)).toBe(true);
    expect(JSON.stringify(error)).not.toContain("SECRET_AUTH_TOKEN");
  });
});

describe("read-only list errors remain display strings", () => {
  it.each([["Item", itemReducer, services.item.getItems, fetchItems], ["Invoice", invoiceReducer, services.invoice.getInvoices, fetchInvoices], ["Expense", expenseReducer, services.expense.getExpenses, fetchExpenses]])("preserves the existing %s list contract", async (_, reducer, request, thunk) => {
    request.mockRejectedValue(validation("Name"));
    const store = storeFor(reducer); const error = await dispatchRejected(store, thunk);
    expect(typeof error).toBe("string"); expect(typeof store.getState().resource.error).toBe("string");
  });
});
