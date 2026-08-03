import { z } from "zod";

import {
  DISPATCH_ROUNDING_MODES,
  DISPATCH_TIERS,
} from "../../constants/dispatchEnums";
import { getEffectiveDateRangeError } from "../../utils/supplyChainValidation";

const optional = (value) =>
  value === "" || value === null || value === undefined ? undefined : value;
const optionalText = z.preprocess(
  (value) => String(value ?? "").trim() || null,
  z.string().nullable(),
);
const identifier = z.union([
  z.string().trim().min(1, "This field is required."),
  z.number(),
]);
const optionalIdentifier = z.preprocess(
  optional,
  z.union([z.string().trim().min(1), z.number()]).optional(),
);
const positive = (label) =>
  z.coerce.number().positive(`${label} must be positive.`);
const nonNegative = (label) =>
  z.coerce.number().min(0, `${label} cannot be negative.`);

export const dispatchSettingSchema = z
  .object({
    allocationPriority: nonNegative("Allocation priority"),
    allowLooseQuantity: z.boolean(),
    channelId: optionalIdentifier,
    effectiveFrom: optionalText,
    effectiveTo: optionalText,
    isActive: z.boolean(),
    itemId: identifier,
    minimumDispatchQuantity: nonNegative("Minimum dispatch quantity"),
    packagingProfileId: optionalIdentifier,
    recurringDemandFactor: positive("Recurring demand factor"),
    roundingMode: z.union([
      z.literal(DISPATCH_ROUNDING_MODES.Exact),
      z.literal(DISPATCH_ROUNDING_MODES.NearestBox),
      z.literal(DISPATCH_ROUNDING_MODES.RoundUpToBox),
      z.literal(DISPATCH_ROUNDING_MODES.RoundDownToBox),
      z.literal(DISPATCH_ROUNDING_MODES.ExactBelowOneBox),
      z.literal(DISPATCH_ROUNDING_MODES.HalfBoxThreshold),
    ]),
    safetyStockFactor: positive("Safety stock factor"),
    tier: z.union([
      z.literal(DISPATCH_TIERS.Tier1),
      z.literal(DISPATCH_TIERS.Tier2),
      z.literal(DISPATCH_TIERS.Tier3),
    ]),
  })
  .superRefine((value, context) => {
    const message = getEffectiveDateRangeError(
      value.effectiveFrom,
      value.effectiveTo,
    );
    if (message) {
      context.addIssue({ code: "custom", message, path: ["effectiveTo"] });
    }
  });

export const dispatchRunSchema = z.object({
  channelId: identifier,
  notes: optionalText,
  planningDate: z.string().min(1, "Planning date is required."),
  salesImportBatchId: identifier,
  warehouseInboundImportBatchId: optionalIdentifier,
  warehouseStockImportBatchId: identifier,
});

export const getDispatchSchemaErrors = (result) =>
  result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join(".") || "form",
          issue.message,
        ]),
      );
