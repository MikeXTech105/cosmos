// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../services/manufacturing/productionApi", () => ({ default: { get: calls.get } }));
import CompanyDraftScopeProvider from "./CompanyDraftScopeProvider";
import useScopedDraft from "../../hooks/useScopedDraft";

const store = configureStore({ reducer: { auth: (state = { user: { id: "operator" }, roles: [], pages: [] }) => state } });
const wrapper = ({ children }) => <Provider store={store}><CompanyDraftScopeProvider>{children}</CompanyDraftScopeProvider></Provider>;
afterEach(() => { cleanup(); calls.get.mockReset(); sessionStorage.clear(); localStorage.clear(); });
describe("trusted company draft identity", () => {
  it("remounts open form state on account/company identity change before enabling the next draft scope", async () => {
    calls.get.mockResolvedValueOnce({ data: { data: { companyKey: "catalog-a" } } }).mockResolvedValueOnce({ data: { data: { companyKey: "catalog-b" } } });
    const changingStore = configureStore({ reducer: { auth: (state = { user: { id: "a", companyId: "catalog-a" } }, action) => action.type === "change-account" ? action.payload : state } });
    const ChangingWrapper = ({ children }) => <Provider store={changingStore}><CompanyDraftScopeProvider>{children}</CompanyDraftScopeProvider></Provider>;
    const { result } = renderHook(() => {
      const [value, setValue] = useState("");
      return { value, setValue, draft: useScopedDraft({ entity: "invoice", values: { value }, enabled: false }) };
    }, { wrapper: ChangingWrapper });
    await waitFor(() => expect(calls.get).toHaveBeenCalledOnce());
    act(() => result.current.setValue("Private company A form"));
    act(() => changingStore.dispatch({ type: "change-account", payload: { user: { id: "b", companyId: "catalog-b" } } }));
    expect(result.current.value).toBe("");
    await waitFor(() => expect(calls.get).toHaveBeenCalledTimes(2));
    expect(localStorage.length).toBe(0);
  });
  it("enables draft recovery from the real authenticated runtime even when the token has no company claim", async () => {
    calls.get.mockResolvedValue({ data: { data: { companyKey: "real-configured-catalog" }, succeeded: true } });
    const { result } = renderHook(() => useScopedDraft({ entity: "invoice", values: {}, enabled: false }), { wrapper });
    await waitFor(() => expect(result.current.available).toBe(true));
    result.current.saveDraft({ reference: "draft" });
    expect(localStorage.key(0)).toContain("real-configured-catalog");
  });
  it("does not invent a catalog identity when runtime validation fails", async () => {
    calls.get.mockRejectedValue(new Error("Company configuration missing"));
    const { result } = renderHook(() => useScopedDraft({ entity: "invoice", values: {}, enabled: false }), { wrapper });
    await waitFor(() => expect(calls.get).toHaveBeenCalledOnce());
    expect(result.current.available).toBe(false);
    expect(result.current.saveDraft({ reference: "draft" })).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });
});
