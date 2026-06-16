import { z } from "zod";
import { ITEM_TYPE } from "./itemTypes";

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    resetToken: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

export const unitSchema = z.object({
  name: z.string().trim().min(2, "Unit name is required"),
  shortName: z.string().trim().min(1, "Short name is required"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional(),
  isActive: z.boolean(),
});

const nonNegativeNumber = (label) => {
  return z.coerce.number().min(0, `${label} cannot be negative`);
};

const lookupId = z.union([
  z.literal(""),
  z.number().int().positive(),
]);

const parseItemTypeInput = (value) => {
  if (value === null || value === undefined || value === "") {
    return ITEM_TYPE.PRODUCT;
  }

  const stringValue = String(value).toLowerCase();

  if (stringValue === "product") {
    return ITEM_TYPE.PRODUCT;
  }

  if (stringValue === "service") {
    return ITEM_TYPE.SERVICE;
  }

  return Number(value);
};

const itemTypeSchema = z.preprocess(
  parseItemTypeInput,
  z.union([
    z.literal(ITEM_TYPE.PRODUCT),
    z.literal(ITEM_TYPE.SERVICE),
  ]),
);

const imageUrlPattern =
  /^(https?:\/\/.+|\/[^/].+|data:image\/(png|jpe?g|webp);base64,.+)$/i;

export const itemSchema = z
  .object({
    name: z.string().trim().min(2, "Item name is required"),
    itemCode: z.string().trim().optional(),
    barcode: z.string().trim().optional(),
    categoryId: lookupId,
    unitId: lookupId,
    itemType: itemTypeSchema,
    salesPrice: nonNegativeNumber("Sales price"),
    purchasePrice: nonNegativeNumber("Purchase price"),
    hsnCode: z.string().trim().optional(),
    gstRate: nonNegativeNumber("GST rate"),
    trackInventory: z.boolean(),
    openingStock: nonNegativeNumber("Opening stock"),
    openingStockValue: nonNegativeNumber("Opening stock value"),
    currentStock: nonNegativeNumber("Current stock"),
    reservedStock: nonNegativeNumber("Reserved stock"),
    minimumStock: nonNegativeNumber("Minimum stock"),
    description: z
      .string()
      .trim()
      .max(1000, "Description is too long")
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || imageUrlPattern.test(value),
        "Enter a valid image URL",
      ),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.itemType !== ITEM_TYPE.PRODUCT) {
      return;
    }

    if (!values.categoryId) {
      context.addIssue({
        code: "custom",
        message: "Category is required for products",
        path: ["categoryId"],
      });
    }

    if (!values.unitId) {
      context.addIssue({
        code: "custom",
        message: "Unit is required for products",
        path: ["unitId"],
      });
    }
  });
