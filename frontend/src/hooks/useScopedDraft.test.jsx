// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useScopedDraft from "./useScopedDraft";

afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.useRealTimers(); });
const key = "cosmos:draft:company1:user1:daily:2026-10-28";
const options = { scope: "company1:user1", entity: "daily", context: "2026-10-28", version: 3, values: { quantity: "" } };

describe("scoped recoverable drafts", () => {
  it("does not overwrite pending recovered work with the initial empty form", () => {
    vi.useFakeTimers();
    sessionStorage.setItem(key, JSON.stringify({ version: 2, values: { quantity: "24.123456" } }));
    const { result } = renderHook(() => useScopedDraft(options));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.stale).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(key)).values.quantity).toBe("24.123456");
  });
  it("supports immediate first-keystroke saves independently of autosave and isolated contexts", () => {
    const { result, rerender } = renderHook((properties) => useScopedDraft(properties), { initialProps: { ...options, enabled: false } });
    act(() => { expect(result.current.saveDraft({ quantity: "0.000001" })).toBe(true); });
    expect(JSON.parse(localStorage.getItem(key)).values.quantity).toBe("0.000001");
    rerender({ ...options, context: "2026-10-29", enabled: false });
    expect(result.current.recoveredDraft).toBeNull();
    act(() => result.current.clearDraft());
    expect(localStorage.getItem(key)).not.toBeNull();
  });
  it("keeps drafts after the tab session ends and refuses to overwrite newer work from another tab", () => {
    const first = renderHook(() => useScopedDraft({ ...options, enabled: false }));
    const second = renderHook(() => useScopedDraft({ ...options, enabled: false }));
    act(() => first.result.current.saveDraft({ quantity: "15.000001" }));
    act(() => expect(second.result.current.saveDraft({ quantity: "20" })).toBe(false));
    expect(JSON.parse(localStorage.getItem(key)).values.quantity).toBe("15.000001");
    first.unmount(); second.unmount(); sessionStorage.clear();
    const reopened = renderHook(() => useScopedDraft({ ...options, enabled: false }));
    expect(reopened.result.current.recoveredDraft.values.quantity).toBe("15.000001");
  });
});
