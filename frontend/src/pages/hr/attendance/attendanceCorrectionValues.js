import { dateTimeOffset } from "../../../utils/productionValues";
import { websiteUtcDate } from "../../../utils/websiteTime";

export const attendanceWallTime = (value, zone) => {
  const date = websiteUtcDate(value);
  if (!date || !zone) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const utc = (value, zone) => {
  if (!value) return null;
  const [date, time] = value.split("T");
  return new Date(dateTimeOffset(date, time, zone)).toISOString();
};
export const attendanceCorrectionPayload = (record, proposal, reason, zone) => {
  if (!record?.id || !record?.employeeId) throw new Error("Select the employee's recorded attendance day first.");
  const status = Number(proposal.status);
  if (!Number.isInteger(status) || status < 1 || status > 7) throw new Error("Select the proposed attendance status.");
  const proposedCheckInTime = zone && proposal.timeEdited ? utc(proposal.checkInTime, zone) : websiteUtcDate(record.checkInTime)?.toISOString() ?? null;
  const proposedCheckOutTime = zone && proposal.timeEdited ? utc(proposal.checkOutTime, zone) : websiteUtcDate(record.checkOutTime)?.toISOString() ?? null;
  if (proposedCheckInTime && proposedCheckOutTime && proposedCheckOutTime <= proposedCheckInTime) throw new Error("Proposed check-out must be after check-in, including the next date for night shifts.");
  return { employeeId: String(record.employeeId), attendanceId: String(record.id), reason: reason.trim(), proposedAttendanceStatus: status, proposedCheckInTime, proposedCheckOutTime, expectedAttendanceStatus: Number(record.attendanceStatus), expectedCheckInTime: websiteUtcDate(record.checkInTime)?.toISOString() ?? null, expectedCheckOutTime: websiteUtcDate(record.checkOutTime)?.toISOString() ?? null };
};
