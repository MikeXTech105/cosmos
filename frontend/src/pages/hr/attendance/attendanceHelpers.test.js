import { describe, expect, it } from "vitest";

import { HR_ATTENDANCE_STATUS } from "../../../utils/hrEnums";
import {
  buildMonthDays,
  formatAttendanceMinutes,
  getAttendanceDateKey,
  getMonthBounds,
  isEmployeeExpectedOnDate,
  mergeEmployeesWithAttendance,
  shiftDateKey,
  summarizeAttendance,
} from "./attendanceHelpers";

describe("attendanceHelpers", () => {
  it("merges every employee even when an attendance record is missing", () => {
    const roster = mergeEmployeesWithAttendance(
      [
        { id: 1, firstName: "Aarav" },
        { id: 2, firstName: "Diya" },
      ],
      [{ employeeId: 2, attendanceStatus: HR_ATTENDANCE_STATUS.PRESENT }],
    );

    expect(roster).toHaveLength(2);
    expect(roster[0].record).toBeNull();
    expect(roster[1].record?.attendanceStatus).toBe(
      HR_ATTENDANCE_STATUS.PRESENT,
    );
  });

  it("uses the backend attendance status model", () => {
    expect(
      summarizeAttendance([
        { attendanceStatus: HR_ATTENDANCE_STATUS.PRESENT },
        { attendanceStatus: HR_ATTENDANCE_STATUS.HALF_DAY },
        { attendanceStatus: HR_ATTENDANCE_STATUS.ON_LEAVE },
        { attendanceStatus: HR_ATTENDANCE_STATUS.WFH },
      ]),
    ).toMatchObject({ present: 1, halfDay: 1, leave: 1, wfh: 1 });
  });

  it("builds correct leap-year month days and bounds", () => {
    expect(getMonthBounds(2024, 2)).toEqual({
      fromDate: "2024-02-01",
      toDate: "2024-02-29",
    });
    expect(buildMonthDays(2024, 2, "2024-02-15")).toHaveLength(29);
  });

  it("normalizes and shifts date keys without UTC drift", () => {
    expect(getAttendanceDateKey("2026-06-08T09:00:00Z")).toBe("2026-06-08");
    expect(shiftDateKey("2026-06-01", -1)).toBe("2026-05-31");
  });

  it("formats working minutes compactly", () => {
    expect(formatAttendanceMinutes(480)).toBe("8h");
    expect(formatAttendanceMinutes(515)).toBe("8h 35m");
    expect(formatAttendanceMinutes(0)).toBe("—");
  });

  it("does not expect attendance outside the employment dates", () => {
    const employee = {
      joiningDate: "2026-06-10",
      lastWorkingDate: "2026-08-20",
    };

    expect(isEmployeeExpectedOnDate(employee, "2026-06-09")).toBe(false);
    expect(isEmployeeExpectedOnDate(employee, "2026-07-15")).toBe(true);
    expect(isEmployeeExpectedOnDate(employee, "2026-08-21")).toBe(false);
  });
});
