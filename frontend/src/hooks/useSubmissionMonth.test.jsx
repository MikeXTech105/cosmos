// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useSubmissionMonth from "./useSubmissionMonth";
afterEach(cleanup);
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const page = date => ({ items: [{ id: date, businessDate: date }], totalCount: 1, pageNumber: 1 });

describe("submission month request lifecycle", () => {
  it("cancels an old month and never exposes its late records in the new month", async () => {
    const old = deferred(), next = deferred();
    const loadPage = vi.fn(({ fromDate }) => fromDate === "2026-10-01" ? old.promise : next.promise);
    const { result, rerender } = renderHook(({ month }) => useSubmissionMonth({ month, loadPage }), { initialProps: { month: "2026-10" } });
    const oldSignal = loadPage.mock.calls[0][0].signal;
    rerender({ month: "2026-11" });
    expect(oldSignal.aborted).toBe(true);
    await act(async () => { old.resolve(page("2026-10-05")); });
    expect(result.current.complete).toBe(false);
    expect(result.current.entries).toEqual([]);
    await act(async () => { next.resolve(page("2026-11-06")); });
    expect(result.current.complete).toBe(true);
    expect(result.current.entries[0].businessDate).toBe("2026-11-06");
  });

  it("rechecks a re-enabled month instead of calling an old snapshot complete", async () => {
    const second = deferred();
    const loadPage = vi.fn().mockResolvedValueOnce(page("2026-10-05")).mockImplementationOnce(() => second.promise);
    const { result, rerender } = renderHook(({ enabled }) => useSubmissionMonth({ month: "2026-10", loadPage, enabled }), { initialProps: { enabled: true } });
    await waitFor(() => expect(result.current.complete).toBe(true));
    rerender({ enabled: false });
    expect(result.current.entries).toEqual([]);
    rerender({ enabled: true });
    expect(result.current.loading).toBe(true);
    expect(result.current.complete).toBe(false);
    await act(async () => { second.resolve(page("2026-10-06")); });
    expect(result.current.entries[0].businessDate).toBe("2026-10-06");
  });

  it("clears verified coverage immediately during a refresh and withholds gaps after failure", async () => {
    const loadPage = vi.fn().mockResolvedValueOnce(page("2026-10-05")).mockRejectedValueOnce(new Error("Month unavailable"));
    const { result } = renderHook(() => useSubmissionMonth({ month: "2026-10", loadPage }));
    await waitFor(() => expect(result.current.complete).toBe(true));
    act(() => result.current.reload());
    expect(result.current.complete).toBe(false);
    await waitFor(() => expect(result.current.error).toBe("Month unavailable"));
    expect(result.current.entries).toEqual([]);
    expect(result.current.complete).toBe(false);
  });
});
