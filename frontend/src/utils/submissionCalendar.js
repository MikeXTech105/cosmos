export const validSubmissionMonth = month => typeof month === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month);

export function validSubmissionDate(value) {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function submissionToday(now = new Date(), timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function submissionMonthRange(month) {
  if (!validSubmissionMonth(month)) return null;
  const first = new Date(`${month}-01T12:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return { fromDate: `${month}-01`, toDate: last.toISOString().slice(0, 10) };
}

export function shiftSubmissionMonth(month, offset) {
  if (!validSubmissionMonth(month)) return month;
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const next = date.toISOString().slice(0, 7);
  return validSubmissionMonth(next) ? next : month;
}

export function submissionMonthDays({ month, entries = [], getDate, today = submissionToday(), complete = false }) {
  const range = submissionMonthRange(month);
  if (!range) return { days: [], offset: 0, saved: 0, pending: 0, upcoming: 0, totalEntries: 0 };
  const counts = new Map();
  for (const entry of entries) {
    const value = String(getDate(entry) ?? "").slice(0, 10);
    if (value >= range.fromDate && value <= range.toDate && /^\d{4}-\d{2}-\d{2}$/.test(value)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const length = Number(range.toDate.slice(-2));
  const days = Array.from({ length }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const count = counts.get(date) ?? 0;
    return { date, day: index + 1, count, today: date === today, status: count ? "saved" : date > today ? "future" : !complete ? "unknown" : date === today ? "today" : "pending" };
  });
  return {
    days,
    offset: (new Date(`${range.fromDate}T12:00:00Z`).getUTCDay() + 6) % 7,
    saved: days.filter(day => day.count > 0).length,
    pending: days.filter(day => day.status === "pending").length,
    upcoming: days.filter(day => day.status === "future").length,
    totalEntries: days.reduce((total, day) => total + day.count, 0),
  };
}

// Read every page before declaring any date empty. A failed/partial read must
// never turn a day into a false submission gap.
export async function loadSubmissionMonth({ month, loadPage, signal, pageSize = 200, maxPages = 250 }) {
  const range = submissionMonthRange(month);
  if (!range) throw new Error("Choose a valid calendar month.");
  const entries = [];
  const seen = new Set();
  let expectedTotal = null;
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    signal?.throwIfAborted();
    const page = await loadPage({ ...range, pageNumber, pageSize, signal });
    signal?.throwIfAborted();
    if (!page || !Array.isArray(page.items)) throw new Error("The calendar records could not be verified. Retry to check this month.");
    if (page.pageNumber != null && Number(page.pageNumber) !== pageNumber) throw new Error("The calendar returned an incomplete page. Retry to check this month.");
    const total = page.totalCount == null ? null : Number(page.totalCount);
    if (total !== null && (!Number.isSafeInteger(total) || total < 0)) throw new Error("The calendar record count could not be verified.");
    if (expectedTotal !== null && total !== expectedTotal) throw new Error("Records changed while loading the calendar. Refresh to check the whole month.");
    if (total !== null) expectedTotal = total;
    const signature = JSON.stringify(page.items);
    if (page.items.length && seen.has(signature)) throw new Error("The calendar returned a repeated page. Retry to check the whole month.");
    seen.add(signature);
    entries.push(...page.items);
    if (expectedTotal !== null && entries.length > expectedTotal) throw new Error("The calendar record count changed. Refresh to check this month.");
    if (expectedTotal !== null && entries.length === expectedTotal) return entries;
    const size = Number(page.pageSize) > 0 ? Number(page.pageSize) : pageSize;
    if (!page.items.length || (expectedTotal === null && page.totalPages == null && page.items.length < size)) {
      if (expectedTotal !== null && entries.length !== expectedTotal) throw new Error("Some calendar records are unavailable. Retry to check the whole month.");
      return entries;
    }
    if (page.totalPages != null && pageNumber >= Number(page.totalPages)) {
      if (expectedTotal !== null && entries.length !== expectedTotal) throw new Error("Some calendar records are unavailable. Retry to check the whole month.");
      return entries;
    }
  }
  throw new Error("This month has too many records to verify at once. Narrow the calendar scope.");
}
