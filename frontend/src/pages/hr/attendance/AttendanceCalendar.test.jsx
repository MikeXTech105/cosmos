// @vitest-environment jsdom
import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ getAttendance: vi.fn(), dispatch: vi.fn(), saveDraft: vi.fn() }));
vi.mock("react-redux", () => ({ useDispatch: () => f.dispatch }));
vi.mock("../useHrCapabilities", () => ({ default: () => ({ canView: true, canCreate: true, canUpdate: false, canApprove: false }) }));
vi.mock("../../../utils/submissionCalendar", async original => ({ ...(await original()), submissionToday: () => "2026-10-29" }));
vi.mock("../../../utils/userScope", () => ({ getUserScope: () => "attendance-calendar-test" }));
vi.mock("../../../hooks/useScopedDraft", () => ({ default: () => ({ saveDraft: f.saveDraft, recoveredDraft: null, available: true }) }));
vi.mock("../../../services/hr/attendanceService", () => ({ hrAttendanceService: { getAttendance: f.getAttendance } }));
vi.mock("../../../services/hr/employeeService", () => ({ hrEmployeeService: { getEmployees: async () => ({ data: { items: [], totalCount: 0, pageSize: 200, totalPages: 1 } }) } }));
vi.mock("../../../services/hr/departmentService", () => ({ hrDepartmentService: { getDepartments: async () => ({ data: { items: [], totalCount: 0, pageSize: 200, totalPages: 1 } }) } }));
vi.mock("./AttendanceActionModals", () => ({ AdjustmentModal: () => null, DecisionModal: () => null, ManualEntryModal: () => null, QuickActionModal: () => null }));
vi.mock("./EmployeeAttendanceModal", () => ({ default: () => null }));
vi.mock("./AttendanceRoster", () => ({ default: () => null }));
vi.mock("./AttendanceBook", () => ({ default: ({ onSetStatus }) => <button onClick={() => onSetStatus("1", undefined, 1)}>Type attendance draft</button> }));
vi.mock("./DepartmentAttendancePanel", () => ({ default: ({ onDrilldown }) => <button onClick={() => onDrilldown("9")}>Change department scope</button> }));
import AttendanceWorkspace from "./AttendanceWorkspace";
configure({ asyncUtilTimeout: 5000 });

const page = items => ({ data: { items, totalCount: items.length, totalPages: 1, pageNumber: 1, pageSize: 200 } });
const mount = () => render(<MemoryRouter initialEntries={["/hr/attendance?date=2026-10-28&departmentId=7"]}><AttendanceWorkspace /></MemoryRouter>);
const dateButton = (day, label) => screen.getByRole("button", { name: new RegExp(` ${day} October 2026: ${label}`) });

beforeEach(() => {
  f.dispatch.mockReset().mockImplementation(() => Promise.resolve({}));
  f.saveDraft.mockReset().mockReturnValue(true);
  f.getAttendance.mockReset().mockImplementation(async params => page(params.FromDate === params.ToDate ? [] : [{ id: 1, employeeId: 1, attendanceDate: "2026-10-01" }]));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("attendance submission calendar integration", () => {
  it("loads the complete month in department scope and opens a day through the daily attendance query", async () => {
    mount();
    await screen.findByRole("button", { name: /1 October 2026: 1 attendance record/ });
    expect(f.getAttendance.mock.calls.some(([params, options]) => params.FromDate === "2026-10-01" && params.ToDate === "2026-10-31" && params.DepartmentId === "7" && options.signal instanceof AbortSignal)).toBe(true);
    fireEvent.click(dateButton("2", "No entry"));
    await waitFor(() => expect(f.getAttendance.mock.calls.some(([params]) => params.FromDate === "2026-10-02" && params.ToDate === "2026-10-02")).toBe(true));
    await waitFor(() => expect(dateButton("2", "No entry").getAttribute("aria-pressed")).toBe("true"));
  });

  it("keeps the selected date and pending draft until the existing unsaved-work guard permits changing day", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    await screen.findByRole("button", { name: /1 October 2026: 1 attendance record/ });
    fireEvent.click(screen.getByRole("button", { name: "Type attendance draft" }));
    fireEvent.click(dateButton("2", "No entry"));
    expect(confirm).toHaveBeenCalled();
    expect(dateButton("28", "No entry").getAttribute("aria-pressed")).toBe("true");
    expect(f.getAttendance.mock.calls.some(([params]) => params.FromDate === "2026-10-02" && params.ToDate === "2026-10-02")).toBe(false);
    confirm.mockReturnValue(true);
    fireEvent.click(dateButton("2", "No entry"));
    await waitFor(() => expect(dateButton("2", "No entry").getAttribute("aria-pressed")).toBe("true"));
    expect(f.saveDraft).toHaveBeenCalled();
  });

  it("clears prior month results on a department change and does not mark failed reads as empty days", async () => {
    mount();
    await screen.findByRole("button", { name: /1 October 2026: 1 attendance record/ });
    f.getAttendance.mockImplementation(async params => {
      if (params.DepartmentId === "9") throw new Error("Department month unavailable");
      return page([]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Change department scope" }));
    await screen.findByText("Department month unavailable");
    expect(screen.queryByRole("button", { name: /1 October 2026: 1 attendance record/ })).toBeNull();
    expect(dateButton("1", "Not checked")).toBeTruthy();
  });
});
