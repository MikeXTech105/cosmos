import { z } from "zod";
import { decimalText, decimalWire, idWire } from "../../../utils/productionValues";

export const itemLookupIdSchema = z.union([z.literal(""), z.union([z.string(), z.number()]).superRefine((value, context) => {
  try { idWire(value); } catch { context.addIssue({ code: "custom", message: "Select a valid master record." }); }
}).transform(String)]);

// Items stock is DECIMAL(22,6); its currency fields remain DECIMAL(18,2).
export const itemDecimalSchema = (label, scale = 6) => z.preprocess(
  (value) => value === null || value === undefined || value === "" ? "0" : value,
  z.union([z.string(), z.number()]).superRefine((value, context) => {
    try { decimalWire(value, { scale, integerDigits: 16 }); }
    catch (error) { context.addIssue({ code: "custom", message: `${label}: ${error.message}` }); }
  }).transform(decimalText),
);

export function completeItemDecimal(value) {
  const text = String(value ?? "").trim();
  if (!text) return "0";
  // Finish only the decimal separator; retain all entered digits for validation.
  return text.endsWith(".") ? text.slice(0, -1) : text;
}
