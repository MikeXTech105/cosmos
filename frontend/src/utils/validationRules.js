import { z } from "zod";

export const passwordPolicySchema = z.string().min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

export const positiveIntegerId = (label = "Selection") => z.coerce.number()
  .int(`${label} must be a whole number`).positive(`${label} is required`);

export const enumNumber = (values, label = "Selection") => z.coerce.number().int()
  .refine(value => Object.values(values).includes(value), `${label} is invalid`);

export const isValidDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
export const requiredDate = label => z.string().refine(isValidDate, `${label} must be a valid date`);
export const optionalDate = z.string().refine(value => !value || isValidDate(value), "Enter a valid date").optional().transform(value => value || undefined);
export const dateOrder = (values, context, from, to, message) => {
  if (values[from] && values[to] && values[to] < values[from]) {
    context.addIssue({ code: "custom", path: [to], message });
  }
};
