// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { CompanyDraftScopeContext } from "../../../hooks/companyDraftScopeContext";
import paymentReducer, { updateSupplierPayment } from "../../../store/slices/purchase/supplierPaymentSlice";
import { supplierPaymentService } from "../../../services/purchase/supplierPaymentService";
vi.mock("../../../hooks/useProductionRuntime", () => ({ default: () => ({ runtime: { businessDate: "2026-10-28" } }) }));
import { PaymentModal } from "./SupplierPaymentsPage";

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });
const supplier = "11111111-1111-4111-8111-111111111111";
const payment = { id: "9", supplierId: supplier, paymentDate: "2026-10-28", amount: "10.01", paymentMode: 1, allocations: [] };
const props = { isOpen: true, mode: "edit", payment, supplierOptions: [{ value: supplier, label: "Supplier A" }], billOptions: [], onLoadBills: () => {}, onClose: () => {} };
describe("supplier payment save recovery", () => {
  it("retains a reconciliation marker before awaiting the server so a reload cannot blindly resend", async () => {
    const submit = vi.fn(() => new Promise(() => {}));
    const modal = () => <CompanyDraftScopeContext.Provider value="operator:catalog"><PaymentModal {...props} onSubmit={submit} /></CompanyDraftScopeContext.Provider>;
    const first = render(modal());
    fireEvent.submit(screen.getByRole("button", { name: "Save Payment" }).closest("form"));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(JSON.parse(localStorage.getItem(localStorage.key(0))).values.outcomeUnknown).toBe(true);
    first.unmount(); render(modal());
    expect(screen.getByRole("button", { name: "Save Payment" }).disabled).toBe(true);
    fireEvent.submit(screen.getByRole("button", { name: "Save Payment" }).closest("form"));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  });
  it("retains an unchanged edit's uncertain result immediately and blocks a remount before draft restoration", async () => {
    const submit = vi.fn().mockRejectedValue(new Error("Connection lost"));
    const modal = () => <CompanyDraftScopeContext.Provider value="operator:catalog"><PaymentModal {...props} onSubmit={submit} /></CompanyDraftScopeContext.Provider>;
    const first = render(modal());
    fireEvent.submit(screen.getByRole("button", { name: "Save Payment" }).closest("form"));
    await screen.findByText(/The save result is unknown/);
    expect(JSON.parse(localStorage.getItem(localStorage.key(0))).values.outcomeUnknown).toBe(true);
    first.unmount();
    render(modal());
    expect(screen.getByRole("button", { name: "Save Payment" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Discard draft" }).disabled).toBe(true);
    fireEvent.submit(screen.getByRole("button", { name: "Save Payment" }).closest("form"));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "I reviewed saved entries; allow retry" }));
    expect(screen.getByRole("button", { name: "Save Payment" }).disabled).toBe(false);
    expect(JSON.parse(localStorage.getItem(localStorage.key(0))).values.outcomeUnknown).toBe(false);
  });

  it("retains real Redux mutation field errors as a definite rejection instead of an unknown result", async () => {
    vi.spyOn(supplierPaymentService, "updateSupplierPayment").mockRejectedValue({ response: { status: 400, data: { message: "Payment requires correction", errors: { Amount: ["Amount requires review"] } } } });
    const store = configureStore({ reducer: { supplierPayments: paymentReducer } });
    render(<PaymentModal {...props} onSubmit={payload => store.dispatch(updateSupplierPayment({ id: payment.id, payload })).unwrap()} />);
    const save = screen.getByRole("button", { name: "Save Payment" });
    fireEvent.submit(save.closest("form"));
    await screen.findByText("Amount requires review");
    expect(screen.queryByText(/The save result is unknown/)).toBeNull();
    await waitFor(() => expect(save.disabled).toBe(false));
    expect(typeof store.getState().supplierPayments.error).toBe("string");
    expect(screen.getByLabelText(/Amount/).value).toBe("10.01");
  });
  it("blocks blind retries after an unknown save result and requires a history review", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Connection lost"));
    const supplier = "11111111-1111-4111-8111-111111111111";
    render(<PaymentModal isOpen mode="edit" payment={{ id: "9", supplierId: supplier, paymentDate: "2026-10-28", amount: "10.00", paymentMode: 1, allocations: [] }} supplierOptions={[{ value: supplier, label: "Supplier A" }]} billOptions={[]} onLoadBills={vi.fn()} onSubmit={onSubmit} onClose={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Save Payment" });
    const form = button.closest("form");
    fireEvent.submit(form);
    await screen.findByText(/The save result is unknown/);
    expect(button.disabled).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "I reviewed saved entries; allow retry" }));
    expect(button.disabled).toBe(false);
  });
});
