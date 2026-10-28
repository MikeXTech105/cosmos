import { stringify } from "lossless-json";
import { describe, expect, it } from "vitest";
import { hrAttendanceAdjustmentSchema, hrEmployeeSchema, hrLeaveApplySchema } from "./validationSchemas";
import { mapEmployeeToForm, mapFormToPayload } from "../pages/hr/employees/employeeFormMappers";
import { hrCommandIds } from "../services/hr/hrServiceUtils";
describe("HR exact record identities", () => {
  it("preserves all BIGINT digits through form validation, mapping and JSON transport", () => {
    const id = "9007199254740993";
    const form = { ...mapEmployeeToForm(null), employeeCode: "Fixture", firstName: "Example", joiningDate: "2026-10-28", departmentId: id, designationId: id, shiftId: id };
    const parsed = hrEmployeeSchema.parse(form);
    expect(parsed.departmentId).toBe(id);
    expect(stringify(mapFormToPayload(parsed))).toContain('"departmentId":9007199254740993');
    const correction = hrAttendanceAdjustmentSchema.parse({ employeeId: id, attendanceId: id, reason: "Review" });
    expect(stringify(hrCommandIds(correction))).toContain('"attendanceId":9007199254740993');
    const leave = hrLeaveApplySchema.parse({ employeeId: id, leaveTypeId: id, startDate: "2026-10-28", endDate: "2026-10-28", reason: "Review" });
    expect(leave.leaveTypeId).toBe(id);
  });
  it("rejects IDs already rounded by a JavaScript numeric conversion", () => {
    expect(hrAttendanceAdjustmentSchema.safeParse({ employeeId: 9007199254740992, attendanceId: "1", reason: "Review" }).success).toBe(false);
  });
});
