import { z } from "zod";
import { positiveIntegerId, requiredDate, optionalDate as calendarDate } from "../../utils/validationRules";

import {
  DISPATCH_ROUNDING_MODES,
  DISPATCH_TIERS,
} from "../../constants/dispatchEnums";
import { getEffectiveDateRangeError } from "../../utils/supplyChainValidation";

const optional = (value) =>
  value === "" || value === null || value === undefined ? undefined : value;
const identifier = positiveIntegerId();
const optionalIdentifier = z.preprocess(
  optional,
  positiveIntegerId().optional(),
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
    effectiveFrom: calendarDate,
    effectiveTo: calendarDate,
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
  notes: z.string().trim().max(1000).optional(),
  planningDate: requiredDate("Planning date"),
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
