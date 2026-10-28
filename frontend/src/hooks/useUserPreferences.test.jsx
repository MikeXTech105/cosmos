// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import useUserPreferences from "./useUserPreferences";
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
const fallback = { views: [] };
const wrapperFor = (id, company = "company-a") => {
  const store = configureStore({ reducer: { auth: (state = { user: { id, companyId: company }, roles: [], pages: [] }) => state } });
  return ({ children }) => <Provider store={store}>{children}</Provider>;
};
describe("account and company report preferences", () => {
  it("reports failed browser persistence without losing the open-page selection", () => {
    const { result } = renderHook(() => useUserPreferences("report:invoices", fallback), { wrapper: wrapperFor("user-a") });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    act(() => result.current[1]({ views: [{ name: "Unpersisted" }] }));
    expect(result.current[0].views[0].name).toBe("Unpersisted");
    expect(result.current[2].error).toContain("will not survive reload");
  });
  it("uses the verified catalog scope when JWT has no company claim", () => {
    let scope = "same-account:catalog-a";
    const Account = wrapperFor("user-a", null);
    const wrapper = ({ children }) => <Account><CompanyDraftScopeContext.Provider value={scope}>{children}</CompanyDraftScopeContext.Provider></Account>;
    const { result, rerender } = renderHook(() => useUserPreferences("report:invoices", fallback), { wrapper });
    act(() => result.current[1]({ views: [{ name: "Catalog A" }] }));
    scope = "same-account:catalog-b"; rerender();
    expect(result.current[0].views).toEqual([]);
    scope = "same-account:catalog-a"; rerender();
    expect(result.current[0].views[0].name).toBe("Catalog A");
  });
  it("reopens saved views after remount and isolates another account and company", () => {
    const first = renderHook(() => useUserPreferences("report:invoices", fallback), { wrapper: wrapperFor("user-a") });
    act(() => first.result.current[1]({ views: [{ name: "Month end", query: "FromDate=2026-10-01" }] }));
    first.unmount();
    const reopened = renderHook(() => useUserPreferences("report:invoices", fallback), { wrapper: wrapperFor("user-a") });
    expect(reopened.result.current[0].views[0].name).toBe("Month end");
    const otherUser = renderHook(() => useUserPreferences("report:invoices", fallback), { wrapper: wrapperFor("user-b") });
    expect(otherUser.result.current[0].views).toEqual([]);
    const otherCompany = renderHook(() => useUserPreferences("report:invoices", fallback), { wrapper: wrapperFor("user-a", "company-b") });
    expect(otherCompany.result.current[0].views).toEqual([]);
  });
});
