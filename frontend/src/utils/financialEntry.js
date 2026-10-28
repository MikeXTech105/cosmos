import { z } from "zod";
import { decimalText, decimalWire, idWire } from "./productionValues";

export const financialMoneySchema = (positive = false) => z.any().transform((value, context) => {
  try { decimalWire(value, { scale: 2, integerDigits: 16, positive }); return decimalText(value); }
  catch (error) { context.addIssue({ code: "custom", message: error.message }); return z.NEVER; }
});
export const financialIdSchema = z.any().transform((value, context) => {
  try { idWire(value); return String(value); }
  catch { context.addIssue({ code: "custom", message: "Select a valid record." }); return z.NEVER; }
});
const ids = new Set(["categoryId", "purchaseBillId"]);
const amounts = new Set(["amount", "taxAmount", "allocatedAmount"]);
export function wireFinancialEntry(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(wireFinancialEntry);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry === null || entry === undefined ? entry : ids.has(key) ? idWire(entry) : amounts.has(key) ? decimalWire(entry, { scale: 2, integerDigits: 16 }) : wireFinancialEntry(entry)]));
}
