// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImportsPage from "./ImportsPage";

const mocks = vi.hoisted(() => ({ stage: vi.fn(), preview: vi.fn(), prepare: vi.fn() }));
vi.mock("../../../hooks/useCapabilities", () => ({ default: () => ({ canView: true, canApprove: false }) }));
vi.mock("../../../services/manufacturing/productionWorkspaceService", () => ({ productionWorkspaceService: mocks }));
vi.mock("./productionImportAdapter", async importOriginal => ({ ...(await importOriginal()), prepareProductionEvidence: mocks.prepare }));
vi.mock("../workspaceHooks", async importOriginal => ({ ...(await importOriginal()), useProductionCapabilities: () => ({ canView: true, canCreate: true, canUpdate: false, canApprove: false }), useProductionRuntime: () => ({ runtime: { companyKey: "test-catalog", businessDate: "2026-10-27", businessTimeZone: "India Standard Time" } }), useWorkspaceLookups: () => ({ items: [], units: [], channels: [], canReadChannels: false, error: "" }) }));

const batchId = "11111111-1111-4111-8111-111111111111";
const evidence = {
  fileName: "adu.csv", fileFingerprint: "actual-file-and-tab-context-fingerprint", headers: ["Item", "Quantity"],
  rows: [{ tab: "ADU", row: 42, column: "B: Quantity", eventFingerprint: "original-cell-evidence", originalJson: '{"tab":"ADU","row":42,"column":"B","value":"330"}', normalizedJson: null, exceptionCode: "UNMAPPED_SOURCE" }],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
  mocks.prepare.mockResolvedValue(evidence);
  mocks.preview.mockResolvedValue({ data: { batchId, version: "v2", status: "Staged", fileName: evidence.fileName, cutoverDate: "2026-10-27", rows: { items: [], totalCount: 0, summary: { unresolvedRows: 0 } } } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function prepareSource() {
  render(<MemoryRouter initialEntries={["/manufacturing/imports"]}><ImportsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("combobox", { name: "Actual source tab" }));
  // The shared select portals after layout; wait for that state under concurrent CI load.
  fireEvent.click(await screen.findByRole("option", { name: "ADU", exact: true }, { timeout: 5000 }));
  const file = new File(["Item,Quantity\nActual,330"], "adu.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV / TSV export (one original tab)"), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText("First data row in original tab"), { target: { value: "42" } });
  fireEvent.click(screen.getByLabelText(/Start-of-day cutover date/));
  fireEvent.click(screen.getByRole("button", { name: "Today", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Preview positional evidence" }));
  await screen.findByRole("button", { name: "Stage evidence" });
  expect(mocks.prepare).toHaveBeenCalledWith({ file, tab: "ADU", firstDataRow: "42", delimiter: "," });
}

describe("real import staging uncertainty and fingerprint recovery", () => {
  it("locks source fields after an unknown stage and recovers the saved batch with one identical source request", async () => {
    let finish;
    mocks.stage.mockRejectedValueOnce(new Error("Connection lost after staging")).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await prepareSource();
    fireEvent.click(screen.getByRole("button", { name: "Stage evidence" }));
    const retry = await screen.findByRole("button", { name: "Retry identical staging request" });
    expect(screen.getByRole("combobox", { name: "Actual source tab" }).disabled).toBe(true);
    expect(screen.getByLabelText("CSV / TSV export (one original tab)").disabled).toBe(true);
    expect(screen.getByLabelText("First data row in original tab").disabled).toBe(true);
    expect(screen.getByLabelText(/Start-of-day cutover date/).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Preview positional evidence" }).disabled).toBe(true);
    expect(retry.disabled).toBe(false);
    const original = mocks.stage.mock.calls[0][0];
    expect(original).toEqual({ fileFingerprint: evidence.fileFingerprint, fileName: evidence.fileName, rows: evidence.rows, cutoverDate: "2026-10-27" });
    expect(Object.hasOwn(original, "idempotencyKey")).toBe(false);
    fireEvent.click(retry); fireEvent.click(retry);
    expect(mocks.stage).toHaveBeenCalledTimes(2);
    expect(mocks.stage.mock.calls[1][0]).toBe(original);
    expect(mocks.prepare).toHaveBeenCalledOnce();
    await act(async () => finish({ data: { batchId, rows: 1, status: "Staged" } }));
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledWith(batchId, { pageNumber: 1, pageSize: 50 }, expect.anything()));
    await waitFor(() => expect(screen.getByLabelText("Saved batch reference").value).toBe(batchId));
    expect(screen.queryByRole("button", { name: "Retry identical staging request" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Actual source tab" }).disabled).toBe(false);
    expect(mocks.stage).toHaveBeenCalledTimes(2);
  });
  it("releases source controls when the identical retry returns a known API rejection", async () => {
    mocks.stage.mockRejectedValueOnce(new Error("Connection lost")).mockRejectedValueOnce({ response: { status: 400, data: { message: "The cutover needs review" } } });
    await prepareSource();
    fireEvent.click(screen.getByRole("button", { name: "Stage evidence" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry identical staging request" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Actual source tab" }).disabled).toBe(false));
    expect(screen.getByLabelText("First data row in original tab").disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Preview positional evidence" }).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Retry identical staging request" })).toBeNull();
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.stage.mock.calls[1][0]).toBe(mocks.stage.mock.calls[0][0]);
  });
});
