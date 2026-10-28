// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useDataBookGrid from "./useDataBookGrid";

describe("Data Book pending-work preservation", () => {
  it("keeps typed values and their original concurrency version across authoritative refresh", async () => {
    const original = { id: "9007199254740993", name: "Name", value: "Original", description: "", category: "Sheet", isPrivate: true, rowVersion: "v1" };
    let server = original;
    const api = { getEntryById: vi.fn(async () => ({ data: server })), createEntry: vi.fn(), updateEntry: vi.fn() };
    const { result, rerender } = renderHook(({ entries }) => useDataBookGrid({ activeSheet: "Sheet", entries, api }), { initialProps: { entries: [original] } });
    await waitFor(() => expect(result.current.hydrating).toBe(false));
    act(() => result.current.updateCell(`entry-${original.id}`, "value", "Unsaved exact value"));
    server = { ...original, value: "Other user's update", rowVersion: "v2" };
    rerender({ entries: [server] });
    await waitFor(() => expect(result.current.hydrating).toBe(false));
    const pending = result.current.rows.find((row) => row.id === original.id);
    expect(pending.value).toBe("Unsaved exact value"); expect(pending.rowVersion).toBe("v1"); expect(pending.isPrivate).toBe(true); expect(result.current.dirtyCount).toBe(1);
    expect(api.updateEntry).not.toHaveBeenCalled();
  });
  it("retains pasted rows for explicit Save all when list data refreshes", async () => {
    const api = { getEntryById: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn() };
    const { result, rerender } = renderHook(({ entries }) => useDataBookGrid({ activeSheet: "Sheet", entries, api }), { initialProps: { entries: [] } });
    act(() => result.current.applyPaste({ matrix: [["Pasted name", "Pasted value", "Review me"]], startRow: 0, startColumn: 0 }));
    rerender({ entries: [] });
    await waitFor(() => expect(result.current.hydrating).toBe(false));
    expect(result.current.rows.some((row) => row.name === "Pasted name" && row.value === "Pasted value" && row.status === "dirty")).toBe(true);
    expect(api.createEntry).not.toHaveBeenCalled();
  });
});
