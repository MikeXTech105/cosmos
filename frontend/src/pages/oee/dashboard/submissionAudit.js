import { hasRecordedProblem, summarizeReadings } from "./productionAnalytics";
const DAY = 86400000;
export const auditTimestamp = (value) => {
  if (!value) return null;
  // Production entry timestamps are stored by SQL with SYSUTCDATETIME.
  const text = String(value);
  const time = Date.parse(
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`,
  );
  return Number.isFinite(time) ? time : null;
};
export function groupSubmissionDays(
  entries,
  basis = "weighted",
  reviewDays = 3,
  now = Date.now(),
) {
  const groups = new Map();
  for (const entry of entries) {
    const date = entry.productionDate?.slice(0, 10);
    if (!date) continue;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(entry);
  }
  return [...groups]
    .map(([date, rows]) => {
      const times = rows.map((row) => auditTimestamp(row.createdAt));
      const valid = times.filter((time) => time !== null && time <= now);
      const first = valid.length ? Math.min(...valid) : null;
      const last = valid.length ? Math.max(...valid) : null;
      const shiftEnd = Date.parse(`${date}T00:00:00+05:30`) + DAY;
      const latency =
        last === null ? null : Math.max(0, (last - shiftEnd) / DAY);
      const machineGroups = new Map();
      for (const row of rows) {
        const key = String(row.machineId);
        if (!machineGroups.has(key)) machineGroups.set(key, []);
        machineGroups.get(key).push(row);
      }
      const duplicates = [...machineGroups.values()].filter(
        (items) => items.length > 1,
      );
      const status =
        valid.length !== rows.length
          ? "unknown"
          : latency > reviewDays
            ? "delayed"
            : "ontime";
      return {
        date,
        rows: [...rows].sort((a, b) =>
          (a.machineCode || a.machineName || "").localeCompare(
            b.machineCode || b.machineName || "",
            undefined,
            { numeric: true },
          ),
        ),
        ...summarizeReadings(rows, basis),
        machines: machineGroups.size,
        first,
        last,
        latency,
        status,
        duplicates,
        anomalies: rows.filter(
          (row) =>
            Number(row.shotCount) > 0 &&
            !(Number(row.calculatedTargetShot) > 0),
        ),
        problems: rows.filter(hasRecordedProblem).length,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function calendarAuditDays(
  groups,
  from,
  to,
  reviewDays = 3,
  now = Date.now(),
) {
  if (!from || !to || from > to) return [];
  const map = new Map(groups.map((day) => [day.date, day]));
  const days = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  const today = new Date(now + 5.5 * 3600000).toISOString().slice(0, 10);
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= end; time += DAY) {
    const date = new Date(time).toISOString().slice(0, 10);
    if (date > today) break;
    const close = Date.parse(`${date}T00:00:00+05:30`) + DAY;
    days.push(
      map.get(date) || {
        date,
        rows: [],
        count: 0,
        machines: 0,
        shots: 0,
        status:
          now < close
            ? "open"
            : now <= close + reviewDays * DAY
              ? "pending"
              : "unlogged",
        duplicates: [],
        anomalies: [],
      },
    );
  }
  return days;
}
