export const RATE_BASES = [
  { value: 1, label: "Units per minute" },
  { value: 2, label: "Seconds per unit" },
  { value: 3, label: "Shots per minute" },
];

export const rowsOf = (response) => {
  const data = response?.data ?? response;
  return Array.isArray(data) ? data : data?.items ?? data?.records ?? [];
};

export const isDecimal = (value, { allowZero = false, atMostOne = false, scale = 6 } = {}) => {
  const source = String(value ?? "").trim();
  if (!new RegExp(`^\\d{1,${22 - scale}}(?:\\.\\d{1,${scale}})?$`).test(source)) return false;
  if (!allowZero && !/[1-9]/.test(source)) return false;
  if (atMostOne && (BigInt(source.split(".")[0]) > 1n || (/^0*1$/.test(source.split(".")[0]) && /[1-9]/.test(source.split(".")[1] ?? "")))) return false;
  return true;
};

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const validDateRange = (from, to) => validDate(from) && (!to || (validDate(to) && to >= from));

export const validateRouting = (form) => {
  if (!form.revision?.trim()) return "Enter a revision.";
  if (form.revision.trim().length > 50) return "Use at most 50 characters for the routing revision.";
  if (!validDateRange(form.effectiveFrom, form.effectiveTo)) return "Choose a valid effective date range.";
  if (!form.steps?.length) return "Add at least one routing step.";
  if (form.steps.some((step) => !step.operationId || !step.workCentreId || ![1, 2, 3].includes(Number(step.rateBasis)) || !isDecimal(step.rate) || !isDecimal(step.setupMinutes, { allowZero: true }) || !isDecimal(step.quantityBasis))) return "Every step needs an operation, work centre, positive rate and quantity basis, and nonnegative setup minutes (up to six decimal places).";
  if (form.steps.some((step) => Number(step.rateBasis) === 3 && (!step.machineId || !step.mouldId))) return "Shots per minute needs a verified machine and mould.";
  return "";
};

export const validateRoutingReferences = (form, lookups) => {
  if (lookups.loading || lookups.error) return "Reload current routing references before saving.";
  const active = (records, id) => records.some(record => String(record.id) === String(id) && record.isActive !== false);
  for (const step of form.steps) {
    if (!active(lookups.operations, step.operationId) || !active(lookups.workCentres, step.workCentreId)) return "Select current active operations and work centres.";
    if (step.machineId && (!lookups.canReadMachines || !active(lookups.machines, step.machineId))) return "Reload and choose a permitted active machine.";
    if (step.mouldId && (!lookups.canReadMoulds || !active(lookups.moulds, step.mouldId))) return "Reload and choose a permitted active mould.";
  }
  return "";
};

export const validateIntervals = (intervals) => {
  const offset = /(?:Z|[+-]\d{2}:\d{2})$/;
  for (const interval of intervals) {
    if (!offset.test(interval.from) || !offset.test(interval.to) || !Number.isFinite(Date.parse(interval.from)) || !Number.isFinite(Date.parse(interval.to)) || Date.parse(interval.to) <= Date.parse(interval.from) || !interval.reason?.trim()) return "Use increasing ISO timestamps with explicit UTC offsets and a reason for every interval.";
  }
  const sorted = intervals.map((entry) => [Date.parse(entry.from), Date.parse(entry.to)]).sort((a, b) => a[0] - b[0]);
  if (sorted.some((entry, index) => index > 0 && entry[0] < sorted[index - 1][1])) return "Calendar intervals cannot overlap.";
  return "";
};

export const moveStep = (steps, index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const result = [...steps];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
};

export const lookupLabel = (record) => [record.code ?? record.machineCode ?? record.shiftCode ?? record.itemCode, record.name ?? record.machineName ?? record.mouldName ?? record.shiftName].filter(Boolean).join(" · ") || String(record.id);
export const lookupOptions = (records, selected) => records.filter((entry) => entry.isActive !== false || String(entry.id) === String(selected)).map((entry) => ({ value: entry.id, label: `${lookupLabel(entry)}${entry.isActive === false ? " (inactive)" : ""}`, disabled: entry.isActive === false }));
export const nameOf = (records, id) => records.find((entry) => String(entry.id) === String(id)) ? lookupLabel(records.find((entry) => String(entry.id) === String(id))) : id ? `#${id}` : "—";

// Lookup services have different paging parameter names; each existing service normalizes PageNumber.
export const loadAllLookupPages = async (fetchPage, signal) => {
  const result = [];
  for (let pageNumber = 1; pageNumber <= 1000; pageNumber += 1) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await fetchPage({ PageNumber: pageNumber, PageSize: 200 });
    if (response && Object.hasOwn(response, "data") && response.data == null) throw new Error("Lookup response was empty. Reload the current references.");
    const data = response?.data ?? response;
    const rows = rowsOf(response);
    result.push(...rows);
    const total = Number(data?.totalPages ?? Math.ceil(Number(data?.totalCount ?? 0) / 200));
    if (Array.isArray(data) || rows.length === 0 || (total > 0 ? pageNumber >= total : rows.length < 200)) return result;
  }
  throw new Error("Lookup result exceeds the supported page limit. Narrow the source data.");
};
