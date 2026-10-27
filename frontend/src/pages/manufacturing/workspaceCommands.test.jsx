// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceCommand } from "./workspaceHooks";

afterEach(cleanup);
function Harness({ send, refresh = () => true, value = "1.000001", scope = "complete", inspectedScope = scope }) {
  const command = useWorkspaceCommand();
  return <><button disabled={command.busy || command.conflict} onClick={() => command.run("complete", { quantity: value, version: "opaque-version" }, send, refresh, scope)}>Submit</button><button onClick={() => command.clear(true, inspectedScope)}>Clear after inspection</button><button onClick={() => command.clear(false, scope)}>Unverified clear</button><p role="status">{command.busy ? "Busy" : command.conflict ? "Review required" : command.uncertain ? "Unknown" : command.success ? "Saved" : "Ready"}</p><p role="alert">{command.error}</p></>;
}
describe("command behavior through real rendered controls", () => {
  it("blocks two clicks while one write is in flight, including reset attempts", async () => {
    let finish; const send = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    render(<Harness send={send} />);
    fireEvent.click(screen.getByText("Submit")); fireEvent.click(screen.getByText("Submit")); fireEvent.click(screen.getByText("Clear after inspection"));
    expect(send).toHaveBeenCalledTimes(1); expect(screen.getByText("Submit").disabled).toBe(true);
    await act(async () => finish({ data: { id: 9 }, message: "Saved" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
  });
  it("reuses exactly the same idempotency key after an uncertain result and refuses changed intent", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValue({ data: {} });
    const view = render(<Harness send={send} />);
    fireEvent.click(screen.getByText("Submit")); await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Unknown"));
    const original = send.mock.calls[0][0];
    view.rerender(<Harness send={send} value="2" />); fireEvent.click(screen.getByText("Submit"));
    expect(send).toHaveBeenCalledTimes(1); expect(screen.getByRole("alert").textContent).toContain("unknown");
    view.rerender(<Harness send={send} />); fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2)); expect(send.mock.calls[1][0]).toEqual(original);
  });
  it("latches stale-version conflicts until the source has been inspected", async () => {
    const send = vi.fn().mockRejectedValue({ response: { status: 409, data: { message: "Stale version", data: { conflictCode: "STALE_VERSION" } } } });
    render(<Harness send={send} />); fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Review required"));
    expect(screen.getByText("Submit").disabled).toBe(true); fireEvent.click(screen.getByText("Submit")); expect(send).toHaveBeenCalledTimes(1);
  });
  it("does not turn a committed write plus failed readback into a new uncertain command", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 8 } });
    render(<Harness send={send} refresh={async () => false} />); fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Review required"));
    expect(screen.getByRole("alert").textContent).toContain("command completed");
    fireEvent.click(screen.getByText("Submit")); expect(send).toHaveBeenCalledTimes(1);
  });
  it("assigns a new key for a new reviewed intent after completion", async () => {
    const send = vi.fn().mockResolvedValue({ data: {} }); const view = render(<Harness send={send} />);
    fireEvent.click(screen.getByText("Submit")); await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
    view.rerender(<Harness send={send} value="2" />); fireEvent.click(screen.getByText("Submit")); await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][0].idempotencyKey).not.toBe(send.mock.calls[0][0].idempotencyKey);
  });
  it("does not clear an unknown stock command by reading another Item or using an unverified reset", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValue({ data: {} });
    const view = render(<Harness send={send} scope="stock:one" inspectedScope="stock:two" />);
    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Unknown"));
    const first = send.mock.calls[0][0];
    fireEvent.click(screen.getByText("Unverified clear")); fireEvent.click(screen.getByText("Clear after inspection"));
    expect(screen.getByRole("status").textContent).toBe("Unknown");
    view.rerender(<Harness send={send} scope="stock:two" />);
    fireEvent.click(screen.getByText("Submit")); expect(send).toHaveBeenCalledOnce();
    view.rerender(<Harness send={send} scope="stock:one" />);
    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][0]).toEqual(first);
  });
  it("unlocks a stale source only after inspection of the matching batch", async () => {
    const send = vi.fn().mockRejectedValueOnce({ response: { status: 409, data: { message: "Changed batch" } } }).mockResolvedValue({ data: {} });
    const view = render(<Harness send={send} scope="import:one" inspectedScope="import:two" />);
    fireEvent.click(screen.getByText("Submit")); await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Review required"));
    fireEvent.click(screen.getByText("Clear after inspection")); expect(screen.getByText("Submit").disabled).toBe(true);
    view.rerender(<Harness send={send} scope="import:one" inspectedScope="import:one" />);
    fireEvent.click(screen.getByText("Clear after inspection"));
    expect(screen.getByText("Submit").disabled).toBe(false);
    fireEvent.click(screen.getByText("Submit")); await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  });
  it("uses the pending ref after an awaited failure even when a handler retains the previous render closure", async () => {
    const send = vi.fn().mockRejectedValue({ response: { status: 409, data: { message: "Stale" } } });
    function PreviousRender() {
      const command = useWorkspaceCommand();
      return <><button onClick={async () => { await command.run("adjust", { quantity: "1" }, send, () => true, "stock:one"); command.clear(); await command.run("adjust", { quantity: "2" }, send, () => true, "stock:two"); }}>Run stale closure</button><span>{command.conflict ? "Locked" : "Ready"}</span></>;
    }
    render(<PreviousRender />); fireEvent.click(screen.getByText("Run stale closure"));
    await waitFor(() => expect(screen.getByText("Locked")).toBeTruthy());
    expect(send).toHaveBeenCalledOnce();
  });
});
