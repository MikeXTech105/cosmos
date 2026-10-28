// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => ({ getDepartmentReport: vi.fn() }));
vi.mock("../../../services/hr/attendanceService", () => ({ hrAttendanceService: service }));
import DepartmentAttendancePanel from "./DepartmentAttendancePanel";
afterEach(cleanup);
describe("department attendance operator surface", () => {
  it("loads the actual date/department contract and hands the selected department to daily work", async () => {
    service.getDepartmentReport.mockResolvedValue({ data: [{ departmentId: "12", departmentName: "Stores", employeeCount: 5, presentCount: 4, absentCount: 1, leaveCount: 0, otherCount: 0 }] });
    const drilldown = vi.fn();
    render(<MemoryRouter><DepartmentAttendancePanel date="2026-10-28" departmentId="all" onDrilldown={drilldown} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Load department report" }));
    const link = await screen.findByRole("link", { name: "Stores" });
    expect(service.getDepartmentReport).toHaveBeenCalledWith({ attendanceDate: "2026-10-28", departmentId: undefined });
    expect(link.getAttribute("href")).toBe("/hr/attendance?date=2026-10-28&departmentId=12");
    fireEvent.click(link); expect(drilldown).toHaveBeenCalledWith("12");
  });
});
