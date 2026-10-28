// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";
import useListReturnContext from "./useListReturnContext";
import useFormReturnContext from "./useFormReturnContext";
import { armListReturnPop, listReturnStorageKey, readListReturnSnapshot, validateListReturnContext, writeListReturnSnapshot } from "../utils/listReturnContext";

const auth = { user: { id: "9", companyKey: "co-a" }, roles: [], pages: [{ route: "/items", canView: true }, { route: "/purchase/orders", canView: true }, { route: "/purchase/bills", canView: true }] };
const scope = "account-9:company-a";
const context = { version: 1, scope, key: "items", token: "capture-1", path: "/items?status=active&page=3" };
const filters = { filters: { Search: "widget", IsActive: "active" }, pageNumber: 3, pageSize: 20 };
const snapshot = (extra = {}) => ({ ...context, filters, scroll: { x: 2, y: 480 }, entryKey: "list-entry", pendingReturn: true, ...extra });
const wrapperFor = ({ initialEntries = [{ pathname: "/items", search: "?status=active&page=3", key: "list-entry", state: { listReturn: context } }], initialIndex, getScope = () => scope, getAuth = () => auth } = {}) => {
  const store = configureStore({ reducer: { auth: (state = getAuth()) => state } });
  return ({ children }) => <Provider store={store}><CompanyDraftScopeContext.Provider value={getScope()}><MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>{children}</MemoryRouter></CompanyDraftScopeContext.Provider></Provider>;
};
const useFormHarness = fallback => ({ ...useFormReturnContext(fallback), navigate: useNavigate(), location: useLocation() });
const useListHarness = options => ({ ...useListReturnContext(options), navigate: useNavigate(), location: useLocation() });

beforeEach(() => {
  vi.useFakeTimers(); sessionStorage.clear(); localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("requestAnimationFrame", callback => setTimeout(() => callback(0), 16));
  vi.stubGlobal("cancelAnimationFrame", id => clearTimeout(id));
});
afterEach(() => { window.dispatchEvent(new Event("pagehide")); cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("scoped list and form return context", () => {
  it("captures exact filters/URL in per-tab scoped storage and preserves extra navigation state", () => {
    const { result } = renderHook(() => useListHarness({ key: "items", filters, setFilters: vi.fn(), ready: false }), { wrapper: wrapperFor() });
    let state;
    act(() => { state = result.current.capture({ mode: "edit" }); });
    expect(state.mode).toBe("edit"); expect(state.returnTo).toBe(context.path);
    expect(state.listReturn.scope).toBe(scope);
    const stored = readListReturnSnapshot(scope, "items");
    expect(stored.filters).toEqual(filters); expect(stored.entryKey).toBe("list-entry");
    expect(stored.token).toBe(state.listReturn.token);
    expect(localStorage.length).toBe(0);
  });

  it("restores filters before delayed ready scroll and consumes an exact saved-ID highlight only once", () => {
    writeListReturnSnapshot(snapshot({ highlight: { id: "9007199254740993", token: "save-1" } }));
    const setFilters = vi.fn();
    const options = { key: "items", filters: { filters: {}, pageNumber: 1 }, setFilters, ready: false };
    const first = renderHook(properties => useListReturnContext(properties), { initialProps: options, wrapper: wrapperFor() });
    expect(setFilters).toHaveBeenCalledExactlyOnceWith(filters);
    act(() => vi.advanceTimersByTime(100)); expect(window.scrollTo).not.toHaveBeenCalled();
    first.rerender({ ...options, filters, ready: true });
    act(() => vi.advanceTimersByTime(16));
    first.rerender({ ...options, filters, ready: false });
    act(() => vi.advanceTimersByTime(100)); expect(window.scrollTo).not.toHaveBeenCalled();
    first.rerender({ ...options, filters, ready: true });
    act(() => vi.advanceTimersByTime(40));
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 2, top: 480, behavior: "auto" });
    expect(first.result.current.highlightId).toBe("9007199254740993");
    expect(readListReturnSnapshot(scope, "items").highlight).toBeUndefined();
    first.unmount();
    const second = renderHook(() => useListReturnContext({ ...options, filters, ready: true }), { wrapper: wrapperFor() });
    act(() => vi.advanceTimersByTime(40));
    expect(second.result.current.highlightId).toBeNull();
  });

  it("does not overwrite a changed URL deep link or fresh same-URL visit with old Redux filters", () => {
    writeListReturnSnapshot(snapshot({ pendingReturn: false }));
    const setFilters = vi.fn();
    const fresh = renderHook(() => useListReturnContext({ key: "items", filters: { Search: "new work" }, setFilters }), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items", search: "?status=active&page=3", key: "new-entry" }] }) });
    act(() => vi.advanceTimersByTime(40)); expect(setFilters).not.toHaveBeenCalled(); expect(window.scrollTo).not.toHaveBeenCalled(); fresh.unmount();
    renderHook(() => useListReturnContext({ key: "items", filters: { Search: "URL authority" }, setFilters }), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items", search: "?page=7", state: { listReturn: context } }] }) });
    act(() => vi.advanceTimersByTime(40)); expect(setFilters).not.toHaveBeenCalled(); expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("supports browser Back to the exact captured origin entry while disarming fresh-document POP", () => {
    const stored = snapshot(); writeListReturnSnapshot(stored); armListReturnPop(stored);
    const setFilters = vi.fn();
    const view = renderHook(() => useListHarness({ key: "items", filters: {}, setFilters }), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items", search: "?status=active&page=3", key: "list-entry" }, { pathname: "/items/new", key: "form-entry" }], initialIndex: 1 }) });
    expect(setFilters).not.toHaveBeenCalled();
    act(() => view.result.current.navigate(-1));
    expect(setFilters).toHaveBeenCalledExactlyOnceWith(filters);
    act(() => vi.advanceTimersByTime(40)); expect(window.scrollTo).toHaveBeenCalledOnce(); view.unmount();
    writeListReturnSnapshot(stored); armListReturnPop(stored); window.dispatchEvent(new Event("pagehide"));
    const secondSet = vi.fn();
    renderHook(() => useListReturnContext({ key: "items", filters: {}, setFilters: secondSet }), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items", search: "?status=active&page=3", key: "list-entry" }] }) });
    expect(secondSet).not.toHaveBeenCalled();
  });

  it("propagates the safe origin through save→detail→edit and marks the authoritative saved record", () => {
    writeListReturnSnapshot(snapshot());
    const view = renderHook(() => useFormHarness("/items"), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items/new", state: { listReturn: context } }] }) });
    let state;
    act(() => { state = view.result.current.savedState("9007199254740993", { saved: true }); view.result.current.navigate("/items/9007199254740993", { state }); });
    expect(view.result.current.returnTo).toBe(context.path); expect(view.result.current.location.pathname).toBe("/items/9007199254740993");
    expect(readListReturnSnapshot(scope, "items").highlight.id).toBe("9007199254740993");
    act(() => view.result.current.navigate("/items/9007199254740993/edit", { state: view.result.current.returnState() }));
    expect(view.result.current.hasReturnContext).toBe(true);
    act(() => view.result.current.returnToList());
    expect(view.result.current.location.pathname + view.result.current.location.search).toBe(context.path);
    expect(view.result.current.location.state.listReturn.token).toBe(context.token);
  });

  it("isolates accounts/companies and refuses external or revoked origins", () => {
    writeListReturnSnapshot(snapshot({ highlight: { id: "77", token: "save" } }));
    let currentScope = scope;
    const setFilters = vi.fn();
    const view = renderHook(() => useListReturnContext({ key: "items", filters, setFilters }), { wrapper: wrapperFor({ getScope: () => currentScope }) });
    act(() => vi.advanceTimersByTime(40)); expect(view.result.current.highlightId).toBe("77");
    currentScope = "account-10:company-b"; view.rerender();
    expect(view.result.current.highlightId).toBeNull(); expect(sessionStorage.getItem(listReturnStorageKey(currentScope, "items"))).toBeNull();
    expect(validateListReturnContext({ ...context, path: "//external.example" }, scope, auth)).toBeNull();
    expect(validateListReturnContext(context, scope, { ...auth, pages: [] })).toBeNull();
    expect(validateListReturnContext(context, currentScope, auth)).toBeNull();
  });

  it("keeps cross-document return context without highlighting a bill ID in the order list", () => {
    const origin = { ...context, key: "purchase-orders", path: "/purchase/orders?status=open" };
    writeListReturnSnapshot({ ...snapshot(), ...origin });
    const { result } = renderHook(() => useFormReturnContext("/purchase/bills"), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/purchase/bills/41", state: { listReturn: origin } }] }) });
    act(() => result.current.savedState("41"));
    expect(result.current.returnTo).toBe(origin.path); expect(result.current.returnState().listReturn.key).toBe("purchase-orders");
    expect(readListReturnSnapshot(scope, "purchase-orders").highlight).toBeUndefined();
  });

  it("does not mark an unsafe numeric identity and preserves a newer captured list intent", () => {
    writeListReturnSnapshot(snapshot({ token: "newer-intent" }));
    const { result } = renderHook(() => useFormReturnContext("/items"), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items/1/edit", state: { listReturn: context } }] }) });
    act(() => result.current.savedState("1")); expect(readListReturnSnapshot(scope, "items").highlight).toBeUndefined();
    writeListReturnSnapshot(snapshot()); act(() => result.current.savedState(9007199254740992));
    expect(readListReturnSnapshot(scope, "items").highlight).toBeUndefined();
  });
  it("keeps form return callbacks stable during unrelated renders", () => {
    writeListReturnSnapshot(snapshot());
    const view = renderHook(() => useFormReturnContext("/items"), { wrapper: wrapperFor({ initialEntries: [{ pathname: "/items/1/edit", state: { listReturn: context } }] }) });
    const previous = view.result.current;
    view.rerender();
    expect(view.result.current.returnState).toBe(previous.returnState);
    expect(view.result.current.savedState).toBe(previous.savedState);
    expect(view.result.current.returnToList).toBe(previous.returnToList);
  });
});
