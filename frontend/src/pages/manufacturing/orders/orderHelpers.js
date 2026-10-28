import { getApiCorrelationId, getApiErrorMessage } from "../../../utils/apiError";
import { assertBusinessDate, newCommandKey } from "../../../utils/productionValues";

// Keep the six-place posting quantity separate from twelve-place source audit values.
const factor = (scale) => 10n ** BigInt(scale);
export const decimalUnits = (value, scale = 6) => {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error("Enter a nonnegative decimal quantity without exponent notation.");
  const [whole, rawFraction = ""] = text.split(".");
  const fraction = rawFraction.replace(/0+$/, "");
  if (fraction.length > scale || whole.replace(/^0+/, "").length > 16) throw new Error(`Use at most ${scale} decimal places and 16 whole digits.`);
  return BigInt(whole) * factor(scale) + BigInt(fraction.padEnd(scale, "0"));
};
export const unitsDecimal = (value, scale = 6) => {
  const negative = value < 0n;
  const n = negative ? -value : value;
  const whole = n / factor(scale);
  const fraction = (n % factor(scale)).toString().padStart(scale, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
};
export const quantity = (value, { positive = false } = {}) => {
  const n = decimalUnits(value);
  if (positive && n <= 0n) throw new Error("Quantity must be greater than zero.");
  return unitsDecimal(n);
};
export const addQuantity = (...values) => unitsDecimal(values.reduce((sum, value) => sum + decimalUnits(value), 0n));
export const compareQuantity = (a, b) => {
  const x = decimalUnits(a), y = decimalUnits(b);
  return x === y ? 0 : x > y ? 1 : -1;
};
export const formatOrderQuantity = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  // Do not round audit values, or turn an unknown value into zero.
  return String(value);
};
export const materialEstimate = (line, output) => {
  try {
    const q = decimalUnits(output), component = decimalUnits(line.sourceComponentQuantity ?? line.quantity ?? line.baseQuantity, 12);
    const base = decimalUnits(line.outputBaseQuantity, 12), waste = decimalUnits(line.wastePercent ?? line.wastagePercentage ?? "0", 12);
    if (base <= 0n) return null;
    const numerator = q * component * (100n * factor(12) + waste);
    const denominator = base * 100n * factor(12);
    return unitsDecimal((numerator + denominator / 2n) / denominator);
  } catch { return null; }
};
export const isBusinessDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export const isOffsetTimestamp = (value) => {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,7})?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(String(value));
  return Boolean(match && isBusinessDate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 && Number(match[4] ?? 0) < 60 && (match[6] === "Z" || (Number(match[8]) <= 14 && Number(match[9]) < 60 && (Number(match[8]) < 14 || Number(match[9]) === 0))) && Number.isFinite(Date.parse(value)));
};
export const orderStatusName = (status) => ({ 1: "Draft", 2: "Released", 3: "InProgress", 4: "Completed", 5: "Closed", 6: "Cancelled" })[status] ?? String(status ?? "Unknown");
export const isOrderStatus = (order, ...statuses) => statuses.includes(orderStatusName(order?.status));
export const normalizeOrderPage = (response) => {
  const data = response?.data ?? response ?? {};
  const meta = response?.meta ?? data;
  const pageSize = data.pageSize ?? meta.pageSize ?? 50, totalCount = data.totalCount ?? meta.totalCount ?? (Array.isArray(data) ? data.length : 0);
  const rawSummary = data.summary ?? [];
  // Summary is an object-valued JsonElement in PagedResult: SQL property casing is retained by .NET.
  const summary = Array.isArray(rawSummary) ? rawSummary.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.charAt(0).toLowerCase() + key.slice(1), value]))) : [];
  return { items: Array.isArray(data) ? data : data.items ?? [], totalCount, totalPages: data.totalPages ?? meta.totalPages ?? Math.ceil(totalCount / pageSize), pageNumber: data.pageNumber ?? meta.pageNumber ?? 1, pageSize, summary };
};
export const productionError = (error, fallback = "Unable to complete the production request.") => {
  const text = getApiErrorMessage(error, fallback), correlation = getApiCorrelationId(error);
  return correlation && !text.includes(correlation) ? `${text}\nReference: ${correlation}` : text;
};
export const effectiveOn = (record, date) => record.isActive !== false && (!record.effectiveFrom || record.effectiveFrom <= date) && (!record.effectiveTo || record.effectiveTo >= date);
export const routeEligibleResources = (eligibility, route, date) => route?.steps?.length ? eligibility.filter((entry) => effectiveOn(entry, date) && route.steps.every((step) => (!step.machineId || String(step.machineId) === String(entry.machineId)) && (!step.mouldId || String(step.mouldId) === String(entry.mouldId)))) : [];
export const commonRouteShiftIds = (centres, date) => {
  if (!centres?.length) return new Set();
  const sets = centres.map((centre) => new Set((centre.shifts ?? []).filter((shift) => effectiveOn(shift, date)).map((shift) => String(shift.shiftId))));
  return new Set([...sets[0]].filter((id) => sets.every((set) => set.has(id))));
};
export const entityLabel = (record, kind = "Item") => record ? [record.itemCode ?? record.machineCode ?? record.shiftCode ?? record.code, record.name ?? record.itemName ?? record.machineName ?? record.mouldName ?? record.shiftName ?? record.channelName].filter(Boolean).join(" · ") || `${kind} #${record.id}` : "—";
export { newCommandKey };
export const commandIdentity = (previous, payload, createKey = newCommandKey) => {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, key: createKey() };
};
export const isRecordId = (value) => {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return false;
  const text = String(value ?? "");
  return /^[1-9]\d*$/.test(text) && BigInt(text) <= 9223372036854775807n;
};
export const buildDraftPayload = (form, version) => {
  if (![form.businessDate, form.plannedStart, form.dueDate].every(isBusinessDate)) throw new Error("Choose explicit business, planned start and due dates.");
  if (form.dueDate < form.plannedStart) throw new Error("Due date must be on or after planned start.");
  const ids = ["itemId", "bomId", "routingId", "machineId", "mouldId", "shiftId"];
  if (ids.some((key) => !isRecordId(form[key]))) throw new Error("Select an Item, effective BOM, routing, machine, mould and shift.");
  if (form.channelId && !isRecordId(form.channelId)) throw new Error("Select a valid existing sales channel.");
  if (form.sourcePlanId && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(form.sourcePlanId)) throw new Error("Load a real saved planning snapshot before saving its draft.");
  return { businessDate: form.businessDate, plannedStart: form.plannedStart, dueDate: form.dueDate, ...Object.fromEntries(ids.map((key) => [key, String(form[key])])), plannedQuantity: quantity(form.plannedQuantity, { positive: true }), reference: form.reference?.trim() || null, notes: form.notes?.trim() || null, channelId: form.channelId ? String(form.channelId) : null, sourcePlanId: form.sourcePlanId || null, sourceLineId: form.sourceLineId || null, ...(version ? { version } : {}) };
};
export const verifyPlanningSource = (snapshot, form, currentBusinessDate) => {
  const lines = Array.isArray(snapshot?.lines) ? snapshot.lines : snapshot?.lines?.items ?? [];
  const line = lines.find((entry) => String(entry.itemId) === String(form.itemId));
  if (String(form.sourceLineId) !== String(form.itemId) || !line) throw new Error("The selected Item/source line is absent from this saved planning snapshot. Return to Planning and select the recommendation again.");
  if (!currentBusinessDate || snapshot.asOfDate !== currentBusinessDate) throw new Error("The source snapshot is from a different business date. Refresh Planning and create a draft from the new saved snapshot.");
  if (Number(line.freshness) !== 1 || line.suggestedProduction == null || compareQuantity(line.suggestedProduction, "0") <= 0) throw new Error("This recommendation has stale, missing or no positive demand. Refresh Planning before creating its draft.");
  if (!line.sourceRevision) throw new Error("Planning source revision is unavailable. Refresh the saved snapshot.");
  if (String(snapshot.channelId ?? "") !== String(form.channelId ?? "")) throw new Error("The order channel must match its saved planning snapshot. Return to Planning to select a recommendation for the intended channel.");
  if (compareQuantity(form.plannedQuantity, line.suggestedProduction) > 0) throw new Error("Selected quantity exceeds the saved server recommendation. Refresh Planning or reduce the explicit quantity.");
  return line;
};
export const buildCompletionPayload = (order, materials, form, runtime) => {
  if (!isBusinessDate(form.businessDate)) throw new Error("Choose the actual business date.");
  if (!isOffsetTimestamp(form.occurredAt)) throw new Error("Enter an actual timestamp with an explicit UTC offset, for example 2026-10-27T09:30:00+05:30.");
  if (form.businessDate < order.businessDate) throw new Error("Completion cannot precede the order business date.");
  if (runtime) {
    assertBusinessDate(form.businessDate, runtime);
    if (runtime.businessDate && form.businessDate > runtime.businessDate) throw new Error("Completion cannot use a future company business date.");
    if (runtime.browserTimeZone) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: runtime.browserTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(form.occurredAt)).map((part) => [part.type, part.value]));
      if (`${parts.year}-${parts.month}-${parts.day}` !== form.businessDate) throw new Error("Completion business date must match the actual timestamp in the company timezone.");
    }
  }
  const goodOutput = quantity(form.goodOutput), rejectedOutput = quantity(form.rejectedOutput);
  if (compareQuantity(addQuantity(goodOutput, rejectedOutput), "0") <= 0) throw new Error("Enter positive accepted or rejected output.");
  if (compareQuantity(addQuantity(goodOutput, rejectedOutput), order.remainingQuantity) > 0) throw new Error("Good plus rejected output exceeds the remaining released quantity.");
  if (!materials.length) throw new Error("The frozen material snapshot is unavailable. Reload before posting.");
  const rows = materials.map((material, index) => ({ itemId: material.itemId, unitId: material.unitId, consumedQuantity: quantity(form.materials[index]?.consumedQuantity), scrapQuantity: quantity(form.materials[index]?.scrapQuantity), returnedQuantity: quantity(form.materials[index]?.returnedQuantity) }));
  if (![order.machineId, order.mouldId, order.shiftId].every(isRecordId)) throw new Error("Released resource assignments are unavailable. Reload the order before posting.");
  return { version: order.version, businessDate: form.businessDate, occurredAt: form.occurredAt, goodOutput, rejectedOutput, machineId: order.machineId, mouldId: order.mouldId, shiftId: order.shiftId, materials: rows, varianceReason: form.varianceReason?.trim() || null, sourceReference: form.sourceReference?.trim() || null };
};
export const buildSchedulePayload = (capacity, businessDate, bookings) => {
  if (!isBusinessDate(businessDate)) throw new Error("Choose an explicit capacity business date.");
  if (!capacity?.lines?.length) throw new Error("Read capacity before scheduling.");
  if (capacity.conflictCode || capacity.lines.some((line) => line.conflictCode || line.requiredMinutes == null || line.minimumBookingSeconds == null || line.capacityFactor == null || line.availableMinutes == null || !line.windowFrom || !line.windowTo)) throw new Error("Resolve unavailable capacity and conflicts before scheduling.");
  let previousEnd = -Infinity;
  const lines = [...capacity.lines].sort((a, b) => a.sequence - b.sequence).map((line) => {
    const booking = bookings[String(line.routingStepId)] ?? {};
    if (!isOffsetTimestamp(booking.from) || !isOffsetTimestamp(booking.to)) throw new Error("Every route operation needs start and end timestamps with explicit offsets.");
    const start = Date.parse(booking.from), end = Date.parse(booking.to);
    if (end <= start || start < previousEnd) throw new Error("Operation windows must increase in route order without overlap.");
    if (start < Date.parse(line.windowFrom) || end > Date.parse(line.windowTo)) throw new Error("A booking must remain within its returned shift window.");
    // SQL DATEDIFF_BIG(SECOND) counts UTC second boundaries, including fractional inputs.
    const seconds = BigInt(Math.floor(end / 1000)) - BigInt(Math.floor(start / 1000));
    if (seconds < decimalUnits(line.minimumBookingSeconds, 0)) throw new Error("A booking is shorter than the server's minimum duration at the configured capacity factor.");
    previousEnd = end;
    return { routingStepId: line.routingStepId, from: booking.from, to: booking.to };
  });
  return { version: capacity.version, businessDate, bookings: lines };
};

// Mirrors the authoritative cumulative six-place allocation, including the frozen amendment baseline.
// A preview never substitutes actual consumption or changes the server's posting authority.
export const completionMaterialPreview = (order, materials, completions, form) => materials.map((material, index) => {
  let expectedQuantity = null, actualDeduction = null;
  try {
    if (material.baselineOutputQuantity == null || material.baselineExpectedQuantity == null) throw new Error("Frozen baseline unavailable.");
    const baseOutput = decimalUnits(material.baselineOutputQuantity), baseExpected = decimalUnits(material.baselineExpectedQuantity);
    const released = decimalUnits(order.releasedQuantity), done = decimalUnits(addQuantity(order.completedQuantity, order.rejectedQuantity));
    const output = decimalUnits(addQuantity(form.goodOutput || "0", form.rejectedOutput || "0")), required = decimalUnits(material.requiredQuantity);
    if (released <= baseOutput || done + output < baseOutput || done + output > released || required < baseExpected) throw new Error("Partial output is outside the frozen baseline.");
    const denominator = released - baseOutput, numerator = (required - baseExpected) * (done + output - baseOutput);
    const active = (completions ?? []).filter((entry) => !entry.reversalOfId && !entry.reversedById);
    const recordedOutput = active.reduce((total, entry) => total + decimalUnits(addQuantity(entry.goodOutput, entry.rejectedOutput)), 0n);
    if (recordedOutput !== done) throw new Error("Completion output history is unavailable.");
    const previous = active.reduce((total, entry) => {
      const matching = (entry.materials ?? []).filter((line) => String(line.itemId) === String(material.itemId));
      if (matching.length !== 1) throw new Error("Expected material history is unavailable.");
      return total + decimalUnits(matching[0].expectedQuantity);
    }, 0n);
    const expected = baseExpected + (numerator + denominator / 2n) / denominator - previous;
    if (expected < 0n) throw new Error("Frozen expected history is inconsistent.");
    expectedQuantity = unitsDecimal(expected);
  } catch { /* Missing baseline/history remains unavailable. */ }
  try { actualDeduction = addQuantity(form.materials[index]?.consumedQuantity, form.materials[index]?.scrapQuantity); } catch { /* The operator has not entered valid actual quantities. */ }
  return { itemId: material.itemId, expectedQuantity, actualDeduction, overConsumption: expectedQuantity != null && actualDeduction != null ? compareQuantity(actualDeduction, expectedQuantity) > 0 : null };
});
