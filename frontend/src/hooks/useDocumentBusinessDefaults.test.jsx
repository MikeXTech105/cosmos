// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ runtime: null }));
vi.mock("./useProductionRuntime", () => ({ default: () => ({ runtime: fixture.runtime, loading: false, error: fixture.runtime ? "" : "Unavailable" }) }));
import useDocumentBusinessDefaults from "./useDocumentBusinessDefaults";
afterEach(() => { cleanup(); fixture.runtime = null; });
describe("company business-date document defaults", () => {
  it("seeds only untouched blank business fields from verified context and preserves operator dates", async () => {
    const { result, rerender } = renderHook(() => {
      const form = useForm({ defaultValues: { invoiceDate: "", paymentDate: "" } });
      useDocumentBusinessDefaults({ enabled: true, fields: ["invoiceDate", "paymentDate"], ...form });
      return form;
    });
    expect(result.current.getValues("invoiceDate")).toBe("");
    act(() => result.current.setValue("invoiceDate", "2026-01-15", { shouldDirty: true }));
    fixture.runtime = { businessDate: "2026-10-28", businessTimeZone: "India Standard Time" };
    rerender();
    await waitFor(() => expect(result.current.getValues("paymentDate")).toBe("2026-10-28"));
    expect(result.current.getValues("invoiceDate")).toBe("2026-01-15");
  });
  it("does not replace persisted/edited dates or fabricate dates when context is unavailable", () => {
    const { result, rerender } = renderHook(() => {
      const form = useForm({ defaultValues: { invoiceDate: "2025-11-20", paymentDate: "" } });
      useDocumentBusinessDefaults({ enabled: false, fields: ["invoiceDate", "paymentDate"], ...form });
      return form;
    });
    fixture.runtime = { businessDate: "2026-10-28" }; rerender();
    expect(result.current.getValues()).toEqual({ invoiceDate: "2025-11-20", paymentDate: "" });
  });
  it("keeps an explicitly cleared/touched date blank when company context arrives later", () => {
    const { result, rerender } = renderHook(() => {
      const form = useForm({ defaultValues: { invoiceDate: "" } });
      useDocumentBusinessDefaults({ enabled: true, fields: ["invoiceDate"], ...form });
      return form;
    });
    act(() => result.current.setValue("invoiceDate", "", { shouldTouch: true }));
    fixture.runtime = { businessDate: "2026-10-28" }; rerender();
    expect(result.current.getValues("invoiceDate")).toBe("");
  });
});
