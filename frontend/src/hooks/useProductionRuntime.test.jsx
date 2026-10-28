// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../services/manufacturing/productionApi", () => ({ default: api }));
import useProductionRuntime from "./useProductionRuntime";
const result = companyKey => ({ data: { succeeded: true, data: { companyKey, businessDate: "2026-10-28", browserTimeZone: "Asia/Kolkata" } } });
beforeEach(() => api.get.mockReset());
afterEach(cleanup);
describe("verified manufacturing company context", () => {
  it("masks the previous verified context while reloading and keeps failed setup unavailable", async () => {
    let fail;
    api.get.mockResolvedValueOnce(result("first")).mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    const hook = renderHook(useProductionRuntime);
    await waitFor(() => expect(hook.result.current.runtime?.companyKey).toBe("first"));
    act(() => hook.result.current.reload());
    expect(hook.result.current.runtime).toBeNull();
    expect(hook.result.current.loading).toBe(true);
    await act(async () => fail(new Error("Company setup unavailable")));
    expect(hook.result.current.runtime).toBeNull();
    expect(hook.result.current.error).toBe("Company setup unavailable");
  });
  it("never restores an aborted older company read over a later successful reload", async () => {
    let old, current;
    api.get.mockImplementationOnce(() => new Promise(resolve => { old = resolve; })).mockImplementationOnce(() => new Promise(resolve => { current = resolve; }));
    const hook = renderHook(useProductionRuntime);
    const signal = api.get.mock.calls[0][1].signal;
    act(() => hook.result.current.reload());
    expect(signal.aborted).toBe(true);
    await act(async () => current(result("current")));
    await act(async () => old(result("old")));
    expect(hook.result.current.runtime.companyKey).toBe("current");
  });
});
