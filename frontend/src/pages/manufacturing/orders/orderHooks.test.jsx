// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAsyncResource } from "./orderHooks";

afterEach(cleanup);
describe("authoritative order reads", () => {
  it("cancels the old route read and prevents its late response replacing another order/source", async () => {
    let finish;
    let oldSignal;
    const old = vi.fn(({ signal }) => { oldSignal = signal; return new Promise((resolve) => { finish = resolve; }); });
    const current = vi.fn().mockResolvedValue({ data: { id: 2, version: "new", itemId: 9 } });
    const { result, rerender } = renderHook(({ load }) => useAsyncResource(load), { initialProps: { load: old } });
    await waitFor(() => expect(old).toHaveBeenCalledOnce());
    rerender({ load: current });
    await waitFor(() => expect(result.current.data?.id).toBe(2));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => finish({ data: { id: 1, version: "obsolete", itemId: 8 } }));
    expect(result.current.data).toEqual({ id: 2, version: "new", itemId: 9 });
  });
  it("never exposes the previous entity when a changed-source read fails or access is revoked", async () => {
    const old = vi.fn().mockResolvedValue({ data: { id: 1 } });
    const failed = vi.fn().mockRejectedValue(new Error("New source is unavailable"));
    const { result, rerender } = renderHook(({ load, enabled }) => useAsyncResource(load, enabled), { initialProps: { load: old, enabled: true } });
    await waitFor(() => expect(result.current.data?.id).toBe(1));
    rerender({ load: failed, enabled: true });
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.error).toContain("New source is unavailable"));
    expect(result.current.data).toBeNull();
    rerender({ load: failed, enabled: false });
    expect(result.current.data).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(failed).toHaveBeenCalledOnce();
  });
  it("returns explicit failed readback while keeping prior same-document evidence visible for review", async () => {
    const load = vi.fn().mockResolvedValueOnce({ data: { id: 1, version: "v1" } }).mockRejectedValueOnce(new Error("Readback unavailable"));
    const { result } = renderHook(() => useAsyncResource(load));
    await waitFor(() => expect(result.current.data?.version).toBe("v1"));
    let readback;
    await act(async () => { readback = await result.current.reload(); });
    expect(readback).toBeNull();
    expect(result.current.error).toContain("Readback unavailable");
    expect(result.current.data?.version).toBe("v1");
  });
});
