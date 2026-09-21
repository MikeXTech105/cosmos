export const buildDowntimeAnalysis = (entries) => {
  const recorded = entries.filter((row) => Number(row.downtimeReasonId) > 0 || row.downtimeReasonName?.trim());
  const groups = new Map();
  for (const row of recorded) {
    const key = JSON.stringify([row.machineId, row.downtimeReasonId || row.downtimeReasonName]);
    const group = groups.get(key) || {
      key, machine: row.machineName || row.machineCode || `Machine ${row.machineId}`,
      reason: row.downtimeReasonName || `Reason ${row.downtimeReasonId}`,
      count: 0, dates: new Set(),
    };
    group.count += 1;
    if (row.productionDate) group.dates.add(row.productionDate.slice(0, 10));
    groups.set(key, group);
  }
  return {
    total: entries.length,
    recorded: recorded.length,
    rows: [...groups.values()].map((group) => ({ ...group, days: group.dates.size, percentage: group.count / recorded.length * 100 }))
      .sort((a, b) => b.count - a.count || a.machine.localeCompare(b.machine)),
  };
};

// Never present a first-page sample as a complete monthly analysis.
export const loadDowntimeEntries = async (fetchPage, params, signal) => {
  const entries = [];
  for (let page = 1; page <= 100; page += 1) {
    if (signal?.aborted) throw new Error("Cancelled");
    const response = await fetchPage({ ...params, Page: page, PageSize: 200, SortBy: "productionDate", SortDirection: "asc" }, { signal });
    const data = response.data;
    if (!Array.isArray(data?.items)) throw new Error("Unexpected production entry response.");
    entries.push(...data.items);
    const pages = Number(data.totalPages);
    if (Number.isFinite(pages) && page >= pages) return entries;
    if (!Number.isFinite(pages) && data.items.length < 200) return entries;
    if (data.items.length === 0) throw new Error("Incomplete production data. Refresh and try again.");
  }
  throw new Error("Too many entries to analyse completely. Choose a shorter date range.");
};
