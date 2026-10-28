// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlanningPage from "./planning/PlanningPage";
import OperationalReportsPage from "./reports/OperationalReportsPage";
import ImportsPage from "./imports/ImportsPage";

const mocks = vi.hoisted(() => ({ access: { canView: true, canCreate: true, canUpdate: false, canApprove: false, canExport: true }, snapshot: vi.fn(), demand: vi.fn(), materials: vi.fn(), report: vi.fn(), exportReport: vi.fn(), preview: vi.fn(), importAction: vi.fn() }));
vi.mock("../../hooks/useCapabilities", () => ({ default: () => ({ canView: true, canApprove: false }) }));
vi.mock("../../services/manufacturing/productionWorkspaceService", () => ({ productionWorkspaceService: mocks }));
vi.mock("./WorkspaceShared", async importOriginal => ({ ...(await importOriginal()), WorkspaceNav: () => null }));
vi.mock("./workspaceHooks", async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, WorkspaceNav: () => null, useProductionCapabilities: () => mocks.access, useProductionRuntime: () => ({ runtime: { businessDate: "2026-10-27", businessTimeZone: "India Standard Time" } }), useWorkspaceLookups: () => ({ items: [{ id: 101, itemCode: "FG", name: "Output" }, { id: 102, itemCode: "RM", name: "Material" }], units: [{ id: 1, shortName: "PCS" }, { id: 2, shortName: "KG" }], channels: [], canReadChannels: false, error: "" }) };
});
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.access = { canView: true, canCreate: true, canUpdate: false, canApprove: false, canExport: true }; mocks.demand.mockResolvedValue({ data: { items: [], totalCount: 0 } }); });
function NavigateSource({ to }) { const navigate = useNavigate(); return <button onClick={() => navigate(to)}>Open another source</button>; }

describe("saved planning and authoritative material views", () => {
  it("submits only selected current outputs as exact strings, displays one server pool and keeps stale rows unavailable", async () => {
    mocks.snapshot.mockResolvedValue({ data: { id: "saved-id", asOfDate: "2026-10-27", calculationVersion: "test", inventoryBasis: "Test fixture", lines: { items: [{ itemId: 101, unitId: 1, freshness: 1, suggestedProduction: "9999999999999999.999999", target21: "210", warning15: "150", sevenDayDemand: "70", fourWeekSlice: "75", monthly30Demand: "300" }, { itemId: 102, unitId: 2, freshness: 2, suggestedProduction: "100" }], totalCount: 2 } } });
    mocks.materials.mockResolvedValue({ data: { sourceSnapshotId: "saved-id", calculationVersion: "test", materials: [{ itemId: 102, unitId: 2, requiredQuantity: "10", proposedAllocation: "8", availableQuantity: "8", remainingQuantity: "0", shortage: "2" }], products: [{ itemId: 101, requestedOutput: "9999999999999999.999999", feasibleOutput: "8", bottleneckItemId: 102 }] } });
    render(<MemoryRouter initialEntries={["/manufacturing/planning?snapshot=saved-id"]}><PlanningPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Select FG · Output" })).toBeTruthy());
    expect(screen.getByRole("checkbox", { name: "Select RM · Material" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select FG · Output" }));
    fireEvent.click(screen.getByRole("button", { name: "Shared material feasibility", exact: true }));
    await waitFor(() => expect(mocks.materials).toHaveBeenCalledWith("saved-id", [{ itemId: "101", quantity: "9999999999999999.999999" }]));
    await waitFor(() => expect(screen.getByRole("link", { name: "Review production draft" })).toBeTruthy());
    const href = screen.getByRole("link", { name: "Review production draft" }).getAttribute("href");
    expect(href).toContain("sourcePlanId=saved-id"); expect(href).toContain("sourceLineId=101"); expect(href).toContain("quantity=9999999999999999.999999");
    expect(screen.getByText(/one shared material pool/)).toBeTruthy();
  });
  it("renders forbidden state without fetching inaccessible planning data", () => {
    mocks.access = { canView: false };
    render(<MemoryRouter><PlanningPage /></MemoryRouter>);
    expect(screen.getByRole("alert").textContent).toContain("View access"); expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("removes prior selections and feasibility when another saved snapshot fails to load", async () => {
    mocks.snapshot.mockResolvedValueOnce({ data: { id: "old-plan", asOfDate: "2026-10-27", lines: { items: [{ itemId: 101, unitId: 1, freshness: 1, suggestedProduction: "10" }], totalCount: 1 } } }).mockRejectedValue(new Error("New snapshot is unavailable"));
    mocks.materials.mockResolvedValue({ data: { sourceSnapshotId: "old-plan", materials: [], products: [{ itemId: 101, requestedOutput: "10", feasibleOutput: "10" }] } });
    render(<MemoryRouter initialEntries={["/manufacturing/planning?snapshot=old-plan"]}><NavigateSource to="?snapshot=new-plan" /><PlanningPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Select FG · Output" })).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: "Select FG · Output" })); fireEvent.click(screen.getByRole("button", { name: "Shared material feasibility", exact: true }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Review production draft" })).toBeTruthy());
    fireEvent.click(screen.getByText("Open another source"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("New snapshot is unavailable"));
    expect(screen.queryByRole("checkbox", { name: "Select FG · Output" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Review production draft" })).toBeNull();
    expect(mocks.materials).toHaveBeenCalledTimes(1);
  });
});

describe("import batch source isolation", () => {
  it("cannot post selected old rows after navigating to a batch whose read failed", async () => {
    mocks.access = { canView: true, canCreate: true, canUpdate: true, canApprove: true };
    mocks.preview.mockResolvedValueOnce({ data: { batchId: "old-batch", version: "opaque", status: "Approved", rows: { items: [{ id: 11, tab: "ADU", rowNumber: 2, columnName: "B: SKU", eventFingerprint: "test-hash", originalJson: '{"value":"10"}', disposition: 7, rowStatus: "Approved", exceptionCode: null }], totalCount: 1 } } }).mockRejectedValue(new Error("New batch is unavailable"));
    render(<MemoryRouter initialEntries={["/manufacturing/imports?batch=old-batch"]}><NavigateSource to="?batch=new-batch" /><ImportsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Select ADU row 2 B: SKU" })).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox", { name: "Select ADU row 2 B: SKU" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Review \/ approval \/ posting reason/ }), { target: { value: "Reviewed actual evidence" } });
    expect(screen.getByRole("button", { name: "Post selected rows" }).disabled).toBe(false);
    fireEvent.click(screen.getByText("Open another source"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("New batch is unavailable"));
    expect(screen.queryByRole("button", { name: "Post selected rows" })).toBeNull();
    expect(mocks.importAction).not.toHaveBeenCalled();
  });
});

describe("operational report paging, nulls and export", () => {
  it("renders full-filter unit totals and actual record count, exports the applied filters without page-only restriction", async () => {
    mocks.report.mockResolvedValue({ data: { items: [{ sourceId: 7, sourceType: "StockAsOf", itemId: 101, unitId: 1, businessDate: "2026-10-27", onHandQuantity: "0.000001", reservedQuantity: null, availableQuantity: null }], pageNumber: 1, pageSize: 50, totalCount: 101, summary: { quantityTotals: [{ unitId: 1, unitName: "PCS", onHandQuantity: "1000" }, { unitId: 2, unitName: "KG", onHandQuantity: "20" }], calculationVersion: "test", dataQualityRows: 1 } } });
    mocks.exportReport.mockResolvedValue({ data: new Blob(["{}\n"]) });
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<MemoryRouter initialEntries={["/reports/manufacturing/operations?asOfDate=2026-10-27"]}><OperationalReportsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(screen.getAllByText(/101 records/)).toHaveLength(2));
    expect(screen.getByText("0.000001")).toBeTruthy(); expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("On hand: 1,000")).toBeTruthy(); expect(screen.getByText("On hand: 20")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(mocks.exportReport).toHaveBeenCalledWith("stock-as-of", { asOfDate: "2026-10-27", fromDate: "", toDate: "", itemId: "", channelId: "", search: "" }, "csv"));
    expect(click).toHaveBeenCalledOnce(); create.mockRestore(); click.mockRestore();
  });
});
