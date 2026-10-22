import { hasRecordedProblem } from "./productionAnalytics";

export const buildDowntimeAnalysis = (entries) => {
  const recorded = entries.filter(hasRecordedProblem);
  const groups = new Map();
  for (const row of recorded) {
    const key = JSON.stringify([
      row.machineId,
      row.downtimeReasonId || row.downtimeReasonName,
    ]);
    const group = groups.get(key) || {
      key,
      machine: row.machineName || row.machineCode || `Machine ${row.machineId}`,
      reason: row.downtimeReasonName || `Reason ${row.downtimeReasonId}`,
      count: 0,
      dates: new Set(),
    };
    group.count += 1;
    if (row.productionDate) group.dates.add(row.productionDate.slice(0, 10));
    groups.set(key, group);
  }
  return {
    total: entries.length,
    recorded: recorded.length,
    rows: [...groups.values()]
      .map((group) => ({
        ...group,
        days: group.dates.size,
        percentage: (group.count / recorded.length) * 100,
      }))
      .sort((a, b) => b.count - a.count || a.machine.localeCompare(b.machine)),
  };
};

// Never present a first-page sample as a complete monthly analysis.
export const loadDowntimeEntries = async (fetchPage, params, signal) => {
  const entries = [];
  const seen = new Set();
  let expectedCount;
  let expectedPages;
  for (let page = 1; page <= 100; page += 1) {
    if (signal?.aborted) throw new Error("Cancelled");
    const response = await fetchPage(
      {
        ...params,
        Page: page,
        PageSize: 200,
        SortBy: "productionDate",
        SortDirection: "asc",
      },
      { signal },
    );
    const data = response.data;
    if (signal?.aborted) throw new Error("Cancelled");
    if (!Array.isArray(data?.items))
      throw new Error("Unexpected production entry response.");
    const count = data.totalCount == null ? null : Number(data.totalCount);
    const pages = data.totalPages == null ? null : Number(data.totalPages);
    if (page === 1) {
      expectedCount = count;
      expectedPages = pages;
    }
    if (count !== expectedCount || pages !== expectedPages)
      throw new Error(
        "Production data changed while loading. Refresh and try again.",
      );
    for (const row of data.items) {
      if (row.id == null) continue;
      if (seen.has(String(row.id)))
        throw new Error(
          "Production data changed while loading. Refresh and try again.",
        );
      seen.add(String(row.id));
    }
    entries.push(...data.items);
    const complete =
      pages !== null && Number.isFinite(pages)
        ? page >= pages
        : data.items.length < 200;
    if (complete) {
      if (
        expectedCount !== null &&
        Number.isFinite(expectedCount) &&
        entries.length !== expectedCount
      )
        throw new Error("Incomplete production data. Refresh and try again.");
      return entries;
    }
    if (data.items.length === 0)
      throw new Error("Incomplete production data. Refresh and try again.");
  }
  throw new Error(
    "Too many entries to analyse completely. Choose a shorter date range.",
  );
};
