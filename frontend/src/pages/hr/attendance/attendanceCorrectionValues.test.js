import { describe, expect, it } from "vitest";
import { attendanceCorrectionPayload, attendanceWallTime } from "./attendanceCorrectionValues";
const record = { id: "9007199254740993", employeeId: "9007199254740994", attendanceStatus: 2, attendanceDate: "2026-10-28", checkInTime: "2026-10-27T20:01:34.123", checkOutTime: null };
describe("reviewed attendance corrections", () => {
  it("binds the original identity/snapshot and preserves timestamp precision for status-only correction", () => {
    const payload = attendanceCorrectionPayload(record, { status: 1 }, "Correct status", "Asia/Kolkata");
    expect(payload.attendanceId).toBe("9007199254740993"); expect(payload.employeeId).toBe("9007199254740994");
    expect(payload.proposedAttendanceStatus).toBe(1); expect(payload.expectedAttendanceStatus).toBe(2);
    expect(payload.proposedCheckInTime).toBe("2026-10-27T20:01:34.123Z"); expect(payload.expectedCheckInTime).toBe(payload.proposedCheckInTime);
    expect(attendanceWallTime(record.checkInTime, "Asia/Kolkata")).toBe("2026-10-28T01:31");
  });
  it("converts explicit company wall times, supports a night shift and rejects reversed times", () => {
    const proposal = { status: 1, timeEdited: true, checkInTime: "2026-10-28T23:00", checkOutTime: "2026-10-29T07:00" };
    const payload = attendanceCorrectionPayload(record, proposal, "Night shift", "Asia/Kolkata");
    expect(payload.proposedCheckInTime).toBe("2026-10-28T17:30:00.000Z"); expect(payload.proposedCheckOutTime).toBe("2026-10-29T01:30:00.000Z");
    expect(() => attendanceCorrectionPayload(record, { ...proposal, checkOutTime: "2026-10-28T07:00" }, "Invalid", "Asia/Kolkata")).toThrow("after check-in");
  });
});
