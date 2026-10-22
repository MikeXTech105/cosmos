import { z } from "zod";
import { positiveIntegerId, optionalDate as calendarDate } from "../../utils/validationRules";

import {
  SUPPLY_CHAIN_DIMENSION_UNITS,
  SUPPLY_CHAIN_WEIGHT_UNITS,
} from "../../constants/supplyChainEnums";
import {
  getEffectiveDateRangeError,
  getNetVsGrossWeightError,
} from "../../utils/supplyChainValidation";

const emptyToUndefined = (value) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalNumber = (label, minimum = 0) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(minimum, `${label} cannot be below ${minimum}.`).optional(),
  );

const requiredNumber = (label, minimum = 0) =>
  z.coerce.number().min(minimum, `${label} cannot be below ${minimum}.`);

const requiredIdentifier = positiveIntegerId();

const optionalIdentifier = z.preprocess(
  emptyToUndefined,
  positiveIntegerId().optional(),
);

export const channelSchema = z.object({
  code: z.string().trim().min(1, "Code is required."),
  description: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(1000).nullable()),
  isActive: z.boolean(),
  name: z.string().trim().min(1, "Name is required."),
  sortOrder: requiredNumber("Sort order", 0),
});

export const warehouseSchema = z.object({
  addressLine1: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(250).nullable()),
  addressLine2: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(250).nullable()),
  channelId: requiredIdentifier,
  city: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(100).nullable()),
  isActive: z.boolean(),
  postalCode: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(20).nullable()),
  priority: requiredNumber("Priority", 0),
  region: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(100).nullable()),
  sortOrder: requiredNumber("Sort order", 0),
  state: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(100).nullable()),
  warehouseCode: z.string().trim().min(1, "Warehouse code is required.").max(50).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, underscores or hyphens"),
  warehouseName: z.string().trim().min(1, "Warehouse name is required.").max(150),
});

export const itemMappingSchema = z
  .object({
    channelId: requiredIdentifier,
    channelProductName: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(300).nullable()),
    channelSku: z.string().trim().min(1, "Channel SKU is required.").max(150),
    effectiveFrom: calendarDate,
    effectiveTo: calendarDate,
    externalItemId: z.preprocess(value => String(value ?? "").trim() || null, z.string().max(150).nullable()),
    isActive: z.boolean(),
    isPrimary: z.boolean(),
    itemId: requiredIdentifier,
  })
  .superRefine((value, context) => {
    const message = getEffectiveDateRangeError(
      value.effectiveFrom,
      value.effectiveTo,
    );

    if (message) {
      context.addIssue({
        code: "custom",
        message,
        path: ["effectiveTo"],
      });
    }
  });

export const packagingProfileSchema = z
  .object({
    channelId: optionalIdentifier,
    dimensionUnit: z.enum(SUPPLY_CHAIN_DIMENSION_UNITS),
    effectiveFrom: calendarDate,
    effectiveTo: calendarDate,
    grossWeight: optionalNumber("Gross weight", 0),
    height: optionalNumber("Height", 0),
    isActive: z.boolean(),
    isDefault: z.boolean(),
    itemId: requiredIdentifier,
    length: optionalNumber("Length", 0),
    netWeight: optionalNumber("Net weight", 0),
    packagingCode: z.string().trim().min(1, "Packaging code is required.").max(50).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, underscores or hyphens"),
    packagingName: z.string().trim().max(150),
    unitsPerBox: z.coerce.number().positive("Units per box must be positive"),
    volumetricDivisor: z.preprocess(emptyToUndefined, z.coerce.number().positive("Volumetric divisor must be positive").optional()),
    weightUnit: z.enum(SUPPLY_CHAIN_WEIGHT_UNITS),
    width: optionalNumber("Width", 0),
  })
  .superRefine((value, context) => {
    const weightError = getNetVsGrossWeightError(
      value.netWeight,
      value.grossWeight,
    );
    const dateError = getEffectiveDateRangeError(
      value.effectiveFrom,
      value.effectiveTo,
    );

    if (weightError) {
      context.addIssue({
        code: "custom",
        message: weightError,
        path: ["netWeight"],
      });
    }

    if (dateError) {
      context.addIssue({
        code: "custom",
        message: dateError,
        path: ["effectiveTo"],
      });
    }
  });

export const getSchemaErrors = (result) => {
  if (result.success) {
    return {};
  }

  return Object.fromEntries(
    result.error.issues.map((issue) => [
      issue.path.join(".") || "form",
      issue.message,
    ]),
  );
};
