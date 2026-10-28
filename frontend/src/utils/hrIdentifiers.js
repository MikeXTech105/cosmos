import { z } from "zod";
import { idWire } from "./productionValues";

export const hrIdentifier = (label) => z.union([z.string(), z.number()]).superRefine((value, context) => {
  try { idWire(value); } catch { context.addIssue({ code: "custom", message: `${label} is required and must be a valid record.` }); }
}).transform(String);
export const optionalHrIdentifier = z.union([z.literal(""), z.null(), z.undefined(), hrIdentifier("Selection")]).transform((value) => value || null);
