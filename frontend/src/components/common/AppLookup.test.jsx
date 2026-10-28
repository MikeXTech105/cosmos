// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppLookup from "./AppLookup";

afterEach(cleanup);
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

describe("remote lookup", () => {
  it("keeps the created label through repeated modal focus restoration until explicit search intent", async () => {
    function Editor() { const [id, setId] = useState(""); return <AppLookup label="Category" value={id} onChange={setId} loadPage={async () => ({ items: [], hasMore: false })} onCreate={async () => ({ id: "301", name: "New category" })} />; }
    render(<Editor />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input); fireEvent.click(screen.getByRole("button", { name: "Create new" }));
    await waitFor(() => expect(input.value).toBe("New category"));
    act(() => { input.blur(); input.focus(); });
    expect(input.value).toBe("New category"); expect(input.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(input, { key: "ArrowDown" }); expect(input.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(input, { key: "Escape" }); fireEvent.change(input, { target: { value: "typed" } });
    expect(input.value).toBe("typed"); expect(input.getAttribute("aria-expanded")).toBe("true");
  });
  it("searches server records beyond 200 without coercing long identities", async () => {
    const onChange = vi.fn();
    const loadPage = vi.fn(async ({ search }) => ({ items: search === "late" ? [{ id: "9223372036854775806", name: "Late item 221" }] : [], hasMore: false }));
    render(<AppLookup label="Item" loadPage={loadPage} onChange={onChange} />);
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "late" } });
    fireEvent.click(await screen.findByRole("option", { name: "Late item 221" }));
    expect(loadPage).toHaveBeenCalledWith(expect.objectContaining({ search: "late", page: 1, pageSize: 40 }));
    expect(onChange).toHaveBeenCalledWith("9223372036854775806", expect.objectContaining({ name: "Late item 221" }));
  });
  it("loads later result pages and hydrates inactive selections by ID", async () => {
    const loadPage = vi.fn(async ({ page }) => ({ items: [{ id: String(page), name: `Page ${page}` }], hasMore: page === 1 }));
    render(<AppLookup value="old" label="Party" loadPage={loadPage} loadById={async () => ({ id: "old", name: "Historical inactive customer" })} />);
    await waitFor(() => expect(screen.getByRole("combobox").value).toBe("Historical inactive customer"));
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("button", { name: "Load more results" }));
    expect(await screen.findByRole("option", { name: "Page 2" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Page 1" })).toBeTruthy();
  });
  it("discards delayed earlier queries even when the transport ignores abort", async () => {
    const old = deferred();
    const loadPage = vi.fn(({ search }) => search === "old" ? old.promise : Promise.resolve({ items: [{ id: "new", name: "Current record" }], hasMore: false }));
    render(<AppLookup label="Machine" loadPage={loadPage} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input); fireEvent.change(input, { target: { value: "old" } });
    await waitFor(() => expect(loadPage).toHaveBeenCalledWith(expect.objectContaining({ search: "old" })));
    fireEvent.change(input, { target: { value: "new" } });
    expect(await screen.findByRole("option", { name: "Current record" })).toBeTruthy();
    old.resolve({ items: [{ id: "old", name: "Stale record" }], hasMore: false });
    await waitFor(() => expect(screen.queryByRole("option", { name: "Stale record" })).toBeNull());
  });
  it("keeps a selected record after failure and provides retry", async () => {
    const loadPage = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ items: [{ id: "2", name: "Recovered" }], hasMore: false });
    render(<AppLookup label="Item" value="1" initialOptions={[{ id: "1", name: "Kept item" }]} loadPage={loadPage} />);
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("button", { name: "Retry search" }));
    expect(await screen.findByRole("option", { name: "Recovered" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.getByRole("combobox").value).toBe("Kept item");
  });
  it("selects an inline-created record immediately and restores keyboard focus", async () => {
    const onChange = vi.fn();
    render(<AppLookup label="Item" onChange={onChange} loadPage={async () => ({ items: [], hasMore: false })} onCreate={async () => ({ id: "301", name: "New item" })} />);
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("button", { name: "Create new" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("301", expect.objectContaining({ name: "New item" })));
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });
});
