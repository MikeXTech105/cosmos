// @vitest-environment jsdom
import { useCallback } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useCapabilities from "../../../hooks/useCapabilities";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import ConfigurationPage from "./ConfigurationPage";
import { useCommand, useConfigurationLookups, useConfigurationRead } from "./configurationHooks";

vi.mock("../../../hooks/useCapabilities", () => ({ default: vi.fn() }));
vi.mock("../../../services/manufacturing/productionConfigurationService", () => ({ productionConfigurationService: { listMasters: vi.fn(), saveMaster: vi.fn(), machines: vi.fn(), moulds: vi.fn(), hrShifts: vi.fn() } }));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const access = { canView: true, canCreate: true, canUpdate: true, canApprove: true };
beforeEach(() => {
  vi.clearAllMocks();
  useCapabilities.mockReturnValue(access);
  service.listMasters.mockResolvedValue({ data: { items: [], totalCount: 0, totalPages: 1 } });
  service.hrShifts.mockResolvedValue({ data: { items: [], totalCount: 0 } });
  service.machines.mockResolvedValue({ data: { items: [], totalCount: 0 } });
  service.moulds.mockResolvedValue({ data: { items: [], totalCount: 0 } });
});
afterEach(cleanup);

describe("configuration write/readback boundary", () => {
  it("keeps a committed write distinct from a failed readback and blocks another send", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 12, version: "v2" } });
    const read = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useCommand(read));
    await act(async () => { expect(await result.current.run(send)).toBe(false); });
    expect(result.current).toMatchObject({ committed: true, refreshFailed: true, conflict: true, uncertain: false });
    await act(async () => { expect(await result.current.run(send)).toBe(false); });
    expect(send).toHaveBeenCalledOnce();
    act(() => result.current.clearAfterRead());
    read.mockResolvedValue(true);
    await act(async () => { expect(await result.current.run(send)).toBe(true); });
    expect(result.current.committed).toBe(false);
  });
  it("blocks stale-version resubmission until successful authoritative inspection", async () => {
    const send = vi.fn().mockRejectedValue({ response: { status: 409, data: { message: "Stale version" } } });
    const { result } = renderHook(() => useCommand());
    await act(async () => { await result.current.run(send); });
    expect(result.current.conflict).toBe(true);
    await act(async () => { await result.current.run(send); });
    expect(send).toHaveBeenCalledOnce();
  });
  it("keeps the real master modal open after a committed save whose list refresh failed", async () => {
    render(<ConfigurationPage />);
    await screen.findByText("No records match this search.");
    fireEvent.click(screen.getByRole("button", { name: "Create work centre" }));
    fireEvent.change(screen.getByLabelText(/Code/), { target: { value: "WC-VERIFY" } });
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Verified line" } });
    service.saveMaster.mockResolvedValue({ data: { id: 12, version: "v2" } });
    service.listMasters.mockRejectedValue(new Error("Readback offline"));
    fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
    await screen.findByText(/The change was saved, but its readback failed/);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save", exact: true }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Cancel", exact: true }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Reload saved configuration" }));
    await waitFor(() => expect(service.listMasters.mock.calls.length).toBeGreaterThan(2));
    expect(screen.getByRole("dialog")).toBeTruthy();
    service.listMasters.mockResolvedValue({ data: { items: [{ id: 12, code: "WC-VERIFY", name: "Verified line", isActive: true, version: "v2" }], totalCount: 1, totalPages: 1 } });
    fireEvent.click(screen.getByRole("button", { name: "Reload saved configuration" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(service.saveMaster).toHaveBeenCalledOnce();
    expect(screen.getByText("WC-VERIFY · Verified line")).toBeTruthy();
  });
});

describe("configuration scoped reads and permissions", () => {
  it("discards a previous entity response and masks data immediately when view permission changes", async () => {
    const first = deferred(), second = deferred();
    const fetcher = vi.fn(id => id === "one" ? first.promise : second.promise);
    const { result, rerender } = renderHook(({ id, allowed }) => {
      const load = useCallback(() => fetcher(id), [id]);
      return useConfigurationRead(load, id, allowed);
    }, { initialProps: { id: "one", allowed: true } });
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("one"));
    rerender({ id: "two", allowed: true });
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("two"));
    await act(async () => second.resolve({ data: { id: "two" } }));
    await act(async () => first.resolve({ data: { id: "one" } }));
    expect(result.current.data).toEqual({ id: "two" });
    rerender({ id: "two", allowed: false });
    expect(result.current.data).toBeNull();
  });
  it("does not publish late OEE records after lookup permission is revoked", async () => {
    const first = deferred(); let machineAllowed = true;
    service.machines.mockReturnValue(first.promise);
    useCapabilities.mockImplementation(options => ({ ...access, canView: options.pageName === "OEE.Machines" ? machineAllowed : true }));
    const { result, rerender } = renderHook(() => useConfigurationLookups({ resources: true }));
    await waitFor(() => expect(service.machines).toHaveBeenCalledOnce());
    machineAllowed = false; rerender();
    expect(result.current.machines).toEqual([]);
    await act(async () => first.resolve({ data: { items: [{ id: "9007199254740993", machineName: "Private machine" }], totalCount: 1 } }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.machines).toEqual([]);
    expect(result.current.canReadMachines).toBe(false);
  });
  it("clears previously valid references when a refresh fails", async () => {
    service.machines.mockResolvedValue({ data: { items: [{ id: "9007199254740993", machineName: "Exact identity" }], totalCount: 1 } });
    const { result } = renderHook(() => useConfigurationLookups({ resources: true }));
    await waitFor(() => expect(result.current.machines).toHaveLength(1));
    service.machines.mockRejectedValue(new Error("Lookup offline"));
    await act(async () => { expect(await result.current.refresh()).toBe(false); });
    expect(result.current.machines).toEqual([]);
    expect(result.current.error).toContain("Lookup offline");
  });
});
