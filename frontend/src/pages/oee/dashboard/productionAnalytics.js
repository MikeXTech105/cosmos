// The ERP ratio is weighted by target. Sheet mode averages eligible readings.
const number = (value) =>
  value === null || value === undefined || value === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;
export const readingRatio = (row) => {
  const target = number(row.calculatedTargetShot);
  const shots = number(row.shotCount);
  return target > 0 && shots !== null && shots >= 0
    ? (shots / target) * 100
    : null;
};
export const hasRecordedProblem = (row) => {
  const name = row.downtimeReasonName?.trim();
  if (name && /^(none|no downtime|n\/?a|no issue)$/i.test(name)) return false;
  return Boolean(name || Number(row.downtimeReasonId) > 0);
};
export function selectReadings(
  entries,
  { machine = "", mould = "", mode = "calendar", limit = 30 } = {},
) {
  const scoped = entries.filter(
    (row) =>
      (!machine || String(row.machineId) === String(machine)) &&
      (!mould || String(row.mouldId) === String(mould)),
  );
  if (mode !== "readings") return scoped;
  const counts = new Map();
  return [...scoped]
    .sort(
      (a, b) =>
        String(b.productionDate).localeCompare(String(a.productionDate)) ||
        Number(b.id) - Number(a.id),
    )
    .filter((row) => {
      if (readingRatio(row) === null) return false;
      const key = String(row.machineId);
      const count = counts.get(key) || 0;
      counts.set(key, count + 1);
      return count < Math.max(1, Math.trunc(Number(limit)) || 30);
    });
}
export function summarizeReadings(rows, basis = "weighted") {
  const eligible = rows.filter((row) => readingRatio(row) !== null);
  const shots = rows.reduce(
    (sum, row) => sum + (number(row.shotCount) ?? 0),
    0,
  );
  const target = rows.reduce(
    (sum, row) => sum + Math.max(0, number(row.calculatedTargetShot) ?? 0),
    0,
  );
  const weighted = target > 0 ? (shots / target) * 100 : null;
  const mean = eligible.length
    ? eligible.reduce((sum, row) => sum + readingRatio(row), 0) /
      eligible.length
    : null;
  return {
    shots,
    target,
    weighted,
    mean,
    value: basis === "mean" ? mean : weighted,
    count: rows.length,
    eligible: eligible.length,
    days: new Set(
      rows.map((row) => row.productionDate?.slice(0, 10)).filter(Boolean),
    ).size,
    problems: rows.filter(hasRecordedProblem).length,
    noTarget: rows.filter((row) => readingRatio(row) === null).length,
    gap: Math.max(0, target - shots),
  };
}
export function buildProductionAnalytics(rows, basis = "weighted") {
  const groupBy = (field, name) => {
    const groups = new Map();
    for (const row of rows) {
      const key = String(row[field]);
      if (!groups.has(key))
        groups.set(key, { key, name: row[name] || key, rows: [] });
      groups.get(key).rows.push(row);
    }
    return [...groups.values()].map((group) => ({
      ...group,
      ...summarizeReadings(group.rows, basis),
    }));
  };
  const reasons = new Map();
  for (const row of rows.filter(hasRecordedProblem)) {
    const name = row.downtimeReasonName || `Reason ${row.downtimeReasonId}`;
    const group = reasons.get(name) || { name, count: 0, dates: new Set() };
    group.count += 1;
    group.dates.add(row.productionDate?.slice(0, 10));
    reasons.set(name, group);
  }
  const summary = summarizeReadings(rows, basis);
  return {
    summary,
    machines: groupBy("machineId", "machineName"),
    moulds: groupBy("mouldId", "mouldName").sort((a, b) => b.shots - a.shots),
    trend: groupBy("productionDate", "productionDate").sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    reasons: [...reasons.values()]
      .map((reason) => ({
        ...reason,
        days: reason.dates.size,
        share: (reason.count / summary.problems) * 100,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
