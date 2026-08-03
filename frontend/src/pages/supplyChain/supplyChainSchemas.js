import { z } from "zod";

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

const optionalText = z.preprocess(
  (value) => {
    const text = String(value ?? "").trim();

    return text || null;
  },
  z.string().nullable(),
);

const optionalNumber = (label, minimum = 0) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(minimum, `${label} cannot be below ${minimum}.`).optional(),
  );

const requiredNumber = (label, minimum = 0) =>
  z.coerce.number().min(minimum, `${label} cannot be below ${minimum}.`);

const requiredIdentifier = z.union([
  z.string().trim().min(1, "This field is required."),
  z.number(),
]);

const optionalIdentifier = z.preprocess(
  emptyToUndefined,
  z.union([z.string().trim().min(1), z.number()]).optional(),
);

export const channelSchema = z.object({
  code: z.string().trim().min(1, "Code is required."),
  description: optionalText,
  isActive: z.boolean(),
  name: z.string().trim().min(1, "Name is required."),
  sortOrder: requiredNumber("Sort order", 0),
});

export const warehouseSchema = z.object({
  addressLine1: optionalText,
  addressLine2: optionalText,
  channelId: requiredIdentifier,
  city: optionalText,
  isActive: z.boolean(),
  postalCode: optionalText,
  priority: requiredNumber("Priority", 0),
  region: optionalText,
  sortOrder: requiredNumber("Sort order", 0),
  state: optionalText,
  warehouseCode: z.string().trim().min(1, "Warehouse code is required."),
  warehouseName: z.string().trim().min(1, "Warehouse name is required."),
});

export const itemMappingSchema = z
  .object({
    channelId: requiredIdentifier,
    channelProductName: optionalText,
    channelSku: z.string().trim().min(1, "Channel SKU is required."),
    effectiveFrom: optionalText,
    effectiveTo: optionalText,
    externalItemId: optionalText,
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
    effectiveFrom: optionalText,
    effectiveTo: optionalText,
    grossWeight: optionalNumber("Gross weight", 0),
    height: optionalNumber("Height", 0),
    isActive: z.boolean(),
    isDefault: z.boolean(),
    itemId: requiredIdentifier,
    length: optionalNumber("Length", 0),
    netWeight: optionalNumber("Net weight", 0),
    packagingCode: z.string().trim().min(1, "Packaging code is required."),
    packagingName: z.string().trim().min(1, "Packaging name is required."),
    unitsPerBox: requiredNumber("Units per box", 0.000001),
    volumetricDivisor: optionalNumber("Volumetric divisor", 0.000001),
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
