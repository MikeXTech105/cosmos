import { hasRecordedProblem } from "../dashboard/productionAnalytics";
import { auditTimestamp } from "../dashboard/submissionAudit";

const DAY = 86400000;
export const indiaToday = (now = Date.now()) =>
  new Date(now + 19800000).toISOString().slice(0, 10);
const dayTime = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return NaN;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === value
    ? time
    : NaN;
};
export function comparisonRange({ fromDate, toDate }) {
  const start = dayTime(fromDate),
    end = dayTime(toDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end)
    return null;
  const days = Math.round((end - start) / DAY) + 1;
  // Keep the comparison within the API's supported calendar years.
  if (start - days * DAY < dayTime("0001-01-01")) return null;
  return {
    fromDate: new Date(start - days * DAY).toISOString().slice(0, 10),
    toDate: new Date(start - DAY).toISOString().slice(0, 10),
    days,
  };
}
export function insightPreset(preset, now = Date.now()) {
  const today = indiaToday(now),
    end = dayTime(today);
  let start = end,
    finish = end;
  if (preset === "last7") start -= 6 * DAY;
  if (preset === "last30") start -= 29 * DAY;
  if (preset === "thisMonth") start = dayTime(`${today.slice(0, 7)}-01`);
  if (preset === "lastMonth") {
    finish = dayTime(`${today.slice(0, 7)}-01`) - DAY;
    start = dayTime(`${new Date(finish).toISOString().slice(0, 7)}-01`);
  }
  return {
    fromDate: new Date(start).toISOString().slice(0, 10),
    toDate: new Date(finish).toISOString().slice(0, 10),
  };
}
const numeric = (value) =>
  value != null && value !== "" && Number.isFinite(Number(value))
    ? Number(value)
    : null;
const hasShots = (row) =>
  numeric(row.shotCount) !== null && numeric(row.shotCount) >= 0;
const hasTarget = (row) => numeric(row.calculatedTargetShot) > 0;
export const comparableReading = (row) => hasShots(row) && hasTarget(row);
export function insightSummary(rows) {
  const eligible = rows.filter(comparableReading);
  const actual = rows
    .filter(hasShots)
    .reduce((total, row) => total + Number(row.shotCount), 0);
  const target = eligible.reduce(
    (total, row) => total + Number(row.calculatedTargetShot),
    0,
  );
  const matchedActual = eligible.reduce(
    (total, row) => total + Number(row.shotCount),
    0,
  );
  const grossShortfall = eligible.reduce(
    (total, row) =>
      total +
      Math.max(0, Number(row.calculatedTargetShot) - Number(row.shotCount)),
    0,
  );
  const pairs = new Map();
  rows.forEach((row) => {
    const pair = `${row.productionDate?.slice(0, 10)}:${row.machineId}`;
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  });
  const stamps = rows
    .flatMap((row) => [
      auditTimestamp(row.createdAt),
      auditTimestamp(row.updatedAt),
    ])
    .filter((stamp) => stamp !== null);
  return {
    count: rows.length,
    actual,
    matchedActual,
    target,
    achievement: target > 0 ? (matchedActual / target) * 100 : null,
    netShortfall: target > 0 ? Math.max(0, target - matchedActual) : null,
    overTarget: target > 0 ? Math.max(0, matchedActual - target) : null,
    grossShortfall,
    eligible: eligible.length,
    noTarget: rows.filter((row) => !hasTarget(row)).length,
    invalidShots: rows.filter((row) => !hasShots(row)).length,
    problems: rows.filter(hasRecordedProblem).length,
    duplicates: [...pairs.values()].filter((count) => count > 1).length,
    machines: new Set(rows.map((row) => String(row.machineId))).size,
    days: new Set(
      rows.map((row) => row.productionDate?.slice(0, 10)).filter(Boolean),
    ).size,
    latestDate:
      rows
        .map((row) => row.productionDate?.slice(0, 10))
        .filter(Boolean)
        .sort()
        .at(-1) || null,
    lastSaved: stamps.length ? Math.max(...stamps) : null,
  };
}
export function metricChange(
  current,
  previous,
  { points = false, available = true } = {},
) {
  if (!available || current == null || previous == null)
    return { value: null, text: "No comparable records" };
  if (points) return { value: current - previous, text: "pp" };
  if (previous === 0)
    return current === 0
      ? { value: 0, text: "%" }
      : { value: null, text: "No non-zero baseline" };
  return {
    value: ((current - previous) / Math.abs(previous)) * 100,
    text: "%",
  };
}
export function buildInsights(current, previous, range) {
  const group = (rows, key) => {
    const result = new Map();
    rows.forEach((row) => {
      const id = String(
        key === "productionDate" ? row[key]?.slice(0, 10) : row[key],
      );
      if (!result.has(id)) result.set(id, []);
      result.get(id).push(row);
    });
    return result;
  };
  const currentGroups = group(current, "machineId"),
    previousGroups = group(previous, "machineId");
  const machines = [
    ...new Set([...currentGroups.keys(), ...previousGroups.keys()]),
  ]
    .map((id) => {
      const rows = currentGroups.get(id) || [],
        before = previousGroups.get(id) || [];
      const latest = [...rows, ...before].sort(
        (a, b) =>
          String(b.productionDate).localeCompare(String(a.productionDate)) ||
          Number(b.id) - Number(a.id),
      )[0];
      const stats = insightSummary(rows),
        prior = insightSummary(before);
      return {
        id,
        code: latest.machineCode || latest.machineName || `Machine ${id}`,
        name: latest.machineName,
        rows,
        previous: prior,
        ...stats,
        latestMould: latest.mouldName,
        reasons: [
          ...new Set(
            rows
              .filter(hasRecordedProblem)
              .map(
                (row) =>
                  row.downtimeReasonName || `Reason ${row.downtimeReasonId}`,
              ),
          ),
        ],
        needsAttention:
          rows.length > 0 &&
          (stats.grossShortfall > 0 ||
            stats.problems > 0 ||
            stats.eligible < stats.count ||
            stats.duplicates > 0),
      };
    })
    .sort(
      (a, b) =>
        b.grossShortfall - a.grossShortfall ||
        a.code.localeCompare(b.code, undefined, { numeric: true }),
    );
  const dates = group(current, "productionDate");
  const priorDates = group(previous, "productionDate");
  const comparison = comparisonRange(range);
  const trend = [];
  if (comparison) {
    for (
      let time = dayTime(range.fromDate), index = 0;
      time <= dayTime(range.toDate);
      time += DAY, index += 1
    ) {
      const date = new Date(time).toISOString().slice(0, 10);
      const priorDate = new Date(dayTime(comparison.fromDate) + index * DAY)
        .toISOString()
        .slice(0, 10);
      const rows = dates.get(date) || [],
        before = priorDates.get(priorDate) || [];
      const stats = insightSummary(rows),
        prior = insightSummary(before);
      trend.push({
        date,
        priorDate,
        actual: rows.some(hasShots) ? stats.actual : null,
        target: stats.target > 0 ? stats.target : null,
        previous: before.some(hasShots) ? prior.actual : null,
        count: rows.length,
      });
    }
  }
  return {
    current: insightSummary(current),
    previous: insightSummary(previous),
    machines,
    attention: machines.filter((machine) => machine.needsAttention),
    trend,
  };
}
