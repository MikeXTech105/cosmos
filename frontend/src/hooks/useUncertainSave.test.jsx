// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ account: "account-1", trusted: null }));
vi.mock("../utils/userScope", () => ({ getUserScope: () => auth.account, getTrustedDraftScope: () => auth.trusted }));
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";
import useScopedDraft from "./useScopedDraft";
import useUncertainSave, { saveOutcomeIsUnknown } from "./useUncertainSave";
const options = { entity: "invoice", context: "new", recordId: null };
const key = scope => `cosmos:draft:${scope}:invoice%3Asave-outcome:new`;
const saved = scope => JSON.parse(localStorage.getItem(key(scope)) || "null");
const wrapper = getScope => ({ children }) => <CompanyDraftScopeContext.Provider value={getScope()}>{children}</CompanyDraftScopeContext.Provider>;
beforeEach(() => { auth.account = "account-1"; auth.trusted = null; localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

describe("uncertain save reconciliation journal", () => {
  it("journals immediately before dirty/autosave and blocks remount before optional form recovery", () => {
    const first = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    const api = first.result.current;
    act(() => { expect(api.begin()).toBe(true); expect(saved("company-a").values.marker.phase).toBe("AwaitingResponse"); });
    first.unmount();
    localStorage.setItem("cosmos:draft:company-a:invoice:new", JSON.stringify({ version: 1, values: { amount: "10.00" }, revision: "form-draft" }));
    const remount = renderHook(() => ({ draft: useScopedDraft({ entity: "invoice", context: "new", values: {}, enabled: false }), save: useUncertainSave(options) }), { wrapper: wrapper(() => "company-a") });
    expect(remount.result.current.draft.recoveredDraft.values.amount).toBe("10.00");
    expect(remount.result.current.save.blocked).toBe(true); expect(remount.result.current.save.uncertain).toBe(true);
    act(() => expect(remount.result.current.save.begin()).toBe(false));
  });
  it("keeps one attempt through immediate begin→network failure→finally before any render", () => {
    const { result } = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    const api = result.current;
    let attemptId;
    act(() => {
      expect(api.begin()).toBe(true); attemptId = saved("company-a").values.marker.attemptId;
      expect(api.begin()).toBe(false);
      expect(api.fail({ response: { status: 503 } })).toBe(true); api.finish();
    });
    expect(result.current.marker.attemptId).toBe(attemptId); expect(result.current.marker.phase).toBe("OutcomeUnknown");
    expect(saved("company-a").values.marker.attemptId).toBe(attemptId);
    expect(result.current.inFlight).toBe(false); expect(result.current.blocked).toBe(true);
  });
  it.each([400, 409, 422])("clears definite HTTP%s immediately and leaves retry available", status => {
    const { result } = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    const api = result.current;
    act(() => { expect(api.begin()).toBe(true); expect(api.fail({ response: { status } })).toBe(false); api.finish(); });
    expect(result.current.marker).toBeNull(); expect(result.current.blocked).toBe(false); expect(saved("company-a")).toBeNull();
    act(() => expect(result.current.begin()).toBe(true));
  });
  it.each([408, 500, 503, 504])("retains HTTP%s as unknown until explicit review", status => {
    const { result } = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    act(() => { result.current.begin(); result.current.fail({ response: { status } }); result.current.finish(); });
    expect(result.current.uncertain).toBe(true); expect(saved("company-a").values.marker.phase).toBe("OutcomeUnknown");
    act(() => expect(result.current.allowReviewedRetry()).toBe(true));
    expect(result.current.blocked).toBe(false); expect(saved("company-a")).toBeNull();
  });
  it("does not allow explicit retry while in flight and clears only authoritative success", () => {
    const { result } = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    const api = result.current;
    act(() => { api.begin(); expect(api.allowReviewedRetry()).toBe(false); expect(api.succeed()).toBe(true); api.finish(); });
    expect(result.current.blocked).toBe(false); expect(saved("company-a")).toBeNull();
  });
  it("retains a local blocker as trusted company metadata arrives for the same account", async () => {
    let scope = null;
    const view = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => scope) });
    const original = view.result.current;
    act(() => expect(original.begin()).toBe(true));
    expect(view.result.current.available).toBe(false); expect(view.result.current.blocked).toBe(true); expect(localStorage.length).toBe(0);
    expect(view.result.current.storageError).toMatch(/storage is unavailable/);
    scope = "company-a";
    await act(async () => { view.rerender(); await Promise.resolve(); });
    expect(view.result.current.blocked).toBe(true); expect(view.result.current.inFlight).toBe(true);
    expect(saved("company-a").values.marker.attemptId).toBe(view.result.current.marker.attemptId);
    act(() => { original.fail({ message: "Network Error" }); original.finish(); });
    expect(view.result.current.uncertain).toBe(true); expect(saved("company-a").values.marker.phase).toBe("OutcomeUnknown");
  });
  it("never adopts an old request into another company/account and ignores stale completion callbacks", () => {
    let scope = "company-a";
    const view = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => scope) });
    const old = view.result.current;
    act(() => old.begin()); const prior = saved("company-a");
    scope = "company-b"; view.rerender();
    expect(view.result.current.marker).toBeNull(); expect(view.result.current.blocked).toBe(false);
    act(() => expect(view.result.current.begin()).toBe(true)); const next = saved("company-b");
    act(() => { old.fail({ response: { status: 400 } }); old.succeed(); old.finish(); });
    expect(saved("company-a")).toEqual(prior); expect(saved("company-b")).toEqual(next); expect(view.result.current.inFlight).toBe(true);
    auth.account = "account-2"; scope = null; view.rerender();
    expect(view.result.current.marker).toBeNull(); expect(view.result.current.blocked).toBe(false);
  });
  it("does not let an old attempt's catch/finally clear a new reviewed retry", () => {
    const { result } = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    const old = result.current;
    act(() => { old.begin(); old.fail({ response: { status: 503 } }); old.finish(); });
    act(() => result.current.allowReviewedRetry());
    act(() => result.current.begin()); const activeId = result.current.marker.attemptId;
    act(() => { old.fail({ response: { status: 400 } }); old.succeed(); old.finish(); });
    expect(result.current.marker.attemptId).toBe(activeId); expect(result.current.inFlight).toBe(true); expect(saved("company-a").values.marker.attemptId).toBe(activeId);
  });
  it("keeps a local marker with warning when browser storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage denied"); });
    const { result } = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    act(() => { expect(result.current.begin()).toBe(true); result.current.fail({ message: "Network Error" }); result.current.finish(); });
    expect(result.current.blocked).toBe(true); expect(result.current.storageError).toMatch(/storage is unavailable/);
    expect(saveOutcomeIsUnknown({ response: { status: 400 } })).toBe(false); expect(saveOutcomeIsUnknown({ code: "ECONNABORTED" })).toBe(true);
  });
  it("keeps submit callbacks stable across unrelated renders of the same attempt", () => {
    const view = renderHook(() => useUncertainSave(options), { wrapper: wrapper(() => "company-a") });
    const initial = view.result.current; view.rerender();
    for (const action of ["begin", "fail", "finish", "succeed", "allowReviewedRetry"]) expect(view.result.current[action]).toBe(initial[action]);
    act(() => view.result.current.begin()); const running = view.result.current; view.rerender();
    for (const action of ["begin", "fail", "finish", "succeed", "allowReviewedRetry"]) expect(view.result.current[action]).toBe(running[action]);
  });
});
