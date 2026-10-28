// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppModal from "./AppModal";

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("nested modal keyboard ownership", () => {
  it("retains field focus across busy transitions while Escape uses the current busy state", () => {
    vi.useFakeTimers();
    const close = vi.fn();
    const content = busy => <AppModal title="Editor" isOpen isBusy={busy} onClose={close}><input aria-label="First field" /><input aria-label="Invalid amount" /></AppModal>;
    const view = render(content(false));
    act(() => vi.advanceTimersByTime(50));
    const field = screen.getByLabelText("Invalid amount"); field.focus();
    view.rerender(content(true));
    fireEvent.keyDown(field, { key: "Escape" }); expect(close).not.toHaveBeenCalled();
    view.rerender(content(false));
    act(() => vi.advanceTimersByTime(50));
    expect(document.activeElement).toBe(field);
    fireEvent.keyDown(field, { key: "Escape" }); expect(close).toHaveBeenCalledOnce();
  });
  it("closes only the top dialog on Escape, retaining its originating form", () => {
    const parent = vi.fn(), child = vi.fn();
    render(<><AppModal title="Supplier payment" isOpen onClose={parent}><input aria-label="Payment amount" /></AppModal><AppModal title="Create supplier" isOpen onClose={child}><input aria-label="Supplier name" /></AppModal></>);
    fireEvent.keyDown(screen.getByLabelText("Supplier name"), { key: "Escape" });
    expect(child).toHaveBeenCalledOnce();
    expect(parent).not.toHaveBeenCalled();
  });
  it("respects an Escape already consumed by a child lookup", () => {
    const close = vi.fn();
    render(<AppModal title="Editor" isOpen onClose={close}><input aria-label="Lookup" onKeyDown={(event) => event.preventDefault()} /></AppModal>);
    fireEvent.keyDown(screen.getByLabelText("Lookup"), { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
  });
});
