import { addQuantity, compareQuantity, isOrderStatus, orderStatusName, quantity } from "../orders/orderHelpers";
import { dateTimeOffset } from "../../../utils/productionValues";

export const lanes = [
  { status: 1, label: "To approve", tone: "border-slate-300", action: "Approve release" },
  { status: 2, label: "Ready to start", tone: "border-blue-400", action: "Record production" },
  { status: 3, label: "In progress", tone: "border-amber-400", action: "Record production" },
  { status: 4, label: "Production complete", tone: "border-emerald-400", action: "Review order" },
  { status: 5, label: "Closed", tone: "border-slate-400", action: "Review order" },
  { status: 6, label: "Cancelled", tone: "border-red-300", action: "Review order" },
];
export const primaryAction = order => isOrderStatus(order, "Draft") ? "release" : isOrderStatus(order, "Released", "InProgress") ? "complete" : null;
// Moving a card always opens the actual approval/entry workflow. Never PUT a status.
export function transitionAction(order, target) {
  const status = orderStatusName(order.status);
  if (Number(target) === Number(order.status)) return null;
  if (status === "Draft" && Number(target) === 2) return "release";
  if (["Released", "InProgress"].includes(status) && [3, 4].includes(Number(target))) return "complete";
  if (!["Closed", "Cancelled"].includes(status) && Number(target) === 5) return "close";
  if (!["Closed", "Cancelled"].includes(status) && Number(target) === 6) return "cancel";
  throw new Error("Use the order's approval or production action. Its actual saved quantities determine the column.");
}
export function completionSeed(row, draft, businessDate, time, runtime) {
  if (!isOrderStatus(row, "Released", "InProgress")) throw new Error("Only released or in-progress orders can receive production.");
  if (!runtime?.browserTimeZone || !runtime.businessDate) throw new Error("Load the company business date and timezone before recording production.");
  if (draft?.version && draft.version !== row.version) throw new Error("This order changed. Refresh and review your entry against the latest remainder.");
  const goodOutput = quantity(draft?.goodOutput ?? ""), rejectedOutput = quantity(draft?.rejectedOutput ?? "0");
  if (compareQuantity(addQuantity(goodOutput, rejectedOutput), "0") <= 0) throw new Error("Enter accepted or rejected production before reviewing this row.");
  if (compareQuantity(addQuantity(goodOutput, rejectedOutput), row.remainingQuantity) > 0) throw new Error("Accepted plus rejected exceeds the remaining order quantity.");
  if (businessDate > runtime.businessDate) throw new Error("Production cannot use a future company business date.");
  return { goodOutput, rejectedOutput, businessDate, occurredAt: dateTimeOffset(businessDate, time, runtime.browserTimeZone) };
}
export function companyClock(zone, now = new Date()) {
  if (!zone) return "";
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now); }
  catch { return ""; }
}
export function setupMessage(message) {
  if (/catalog company scope is not configured|business timezone is not configured|Connection string .* is missing/i.test(message)) return "Company setup is incomplete. Your administrator needs to connect this company's production settings before work can be saved.";
  if (/authenticated company does not match|token does not belong to this catalog/i.test(message)) return "Company settings have changed. Sign out and sign in again to load the correct company.";
  return message;
}

export function pasteQuantities(rows, startIndex, startColumn, text, drafts) {
  const cells = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map(line => line.split("\t"));
  if (cells.length > rows.length - startIndex || cells.some(line => line.length > 2 - startColumn)) throw new Error("Paste only accepted and rejected quantities within the visible rows.");
  const next = { ...drafts };
  cells.forEach((line, offset) => {
    const row = rows[startIndex + offset];
    if (!isOrderStatus(row, "Released", "InProgress")) throw new Error("Paste only into orders that are ready for production.");
    if (drafts[row.id]?.version && drafts[row.id].version !== row.version) throw new Error("An order changed. Review its latest remainder before pasting.");
    const draft = { goodOutput: "", rejectedOutput: "0", ...next[row.id], version: row.version };
    line.forEach((value, column) => { draft[["goodOutput", "rejectedOutput"][startColumn + column]] = value.trim() === "" ? "" : quantity(value.trim()); });
    next[row.id] = draft;
  });
  return next;
}
